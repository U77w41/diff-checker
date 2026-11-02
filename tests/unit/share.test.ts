import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  encodeSharePayload,
  decodeSharePayload,
  createDiffBundle,
  parseDiffBundle,
  MAX_SHARE_URL_BYTES,
  MAX_SHARE_ENCODED_CHARS,
  MAX_SHARE_DECODED_CHARS,
  type SharePayload
} from '../../src/core/share';

describe('Share Links & Bundle Persistence (src/core/share.ts)', () => {
  const samplePayload: SharePayload = {
    mode: 'text',
    a: 'const x = 1;\nconsole.log(x);',
    b: 'const x = 2;\nconsole.log(x);',
    fileNameA: 'a.js',
    fileNameB: 'b.js',
    options: { ignoreWhitespace: false, granularity: 'char' }
  };

  it('encodes and decodes a share payload round-trip', () => {
    const encoded = encodeSharePayload(samplePayload);
    expect(encoded.isTooLarge).toBe(false);
    expect(encoded.compressed.length).toBeLessThan(MAX_SHARE_URL_BYTES);

    const decoded = decodeSharePayload(`#s=${encoded.compressed}`);
    expect(decoded).toEqual(samplePayload);
  });

  it('decodes share payload without leading #s=', () => {
    const encoded = encodeSharePayload(samplePayload);
    const decoded = decodeSharePayload(encoded.compressed);
    expect(decoded).toEqual(samplePayload);
  });

  it('flags payloads exceeding 8 KB as too large', () => {
    // Generate a payload that will compress to > 8 KB
    const bigString = 'console.log("hello world");\n'.repeat(5000);
    const bigPayload: SharePayload = {
      mode: 'text',
      a: bigString,
      b: bigString + '\n// modification'
    };

    const encoded = encodeSharePayload(bigPayload);
    expect(encoded.compressed.length).toBeGreaterThan(8192);
    expect(encoded.isTooLarge).toBe(true);
  });

  it('returns null on corrupted share link', () => {
    const corrupted = '#s=NOT_VALID_LZ_STRING_!!!&&&';
    const decoded = decodeSharePayload(corrupted);
    expect(decoded).toBeNull();
  });

  it('returns null on empty or non-share hash', () => {
    expect(decodeSharePayload('')).toBeNull();
    expect(decodeSharePayload('#text')).toBeNull();
    expect(decodeSharePayload('#notebook')).toBeNull();
    expect(decodeSharePayload('#s=')).toBeNull();
  });

  it('creates and parses a downloadable diff bundle (.json)', () => {
    const jsonStr = createDiffBundle(samplePayload);
    const parsed = parseDiffBundle(jsonStr);

    expect(parsed).toEqual(samplePayload);
  });

  it('throws on corrupt diff bundle JSON', () => {
    expect(() => parseDiffBundle('invalid json')).toThrow();
    expect(() => parseDiffBundle('{}')).toThrow(); // missing required fields
  });
});

describe('Share link and bundle validation (audit S5)', () => {
  const roundTrip = (p: unknown) =>
    decodeSharePayload('#s=' + LZString.compressToEncodedURIComponent(JSON.stringify(p)));

  it('rejects oversized encoded data without decompressing', () => {
    expect(decodeSharePayload('#s=' + 'A'.repeat(MAX_SHARE_ENCODED_CHARS + 1))).toBeNull();
  });

  it('rejects payloads that decompress past the cap', () => {
    // 9 KB link that expands to ~11.5 MB. Pre-generated: compressing it takes ~30 s.
    const bomb = readFileSync(resolve(__dirname, '../fixtures/share/lz-bomb.txt'), 'utf8');
    expect(bomb.length).toBeLessThan(MAX_SHARE_ENCODED_CHARS);
    expect(LZString.decompressFromEncodedURIComponent(bomb).length).toBeGreaterThan(
      MAX_SHARE_DECODED_CHARS
    );
    expect(decodeSharePayload('#s=' + bomb)).toBeNull();
  });

  it('allow-lists and type-checks options', () => {
    const p = roundTrip({
      mode: 'text',
      a: 'x',
      b: 'y',
      options: { granularity: 42, ignoreCase: true, similarityThreshold: 0.7, evil: 1 }
    });
    expect(p?.options).toEqual({ ignoreCase: true });
  });

  it('drops non-string or overlong file names', () => {
    expect(
      roundTrip({ mode: 'text', a: '', b: '', fileNameA: { x: 1 } })?.fileNameA
    ).toBeUndefined();
    expect(
      roundTrip({ mode: 'text', a: '', b: '', fileNameA: 'f'.repeat(256) })?.fileNameA
    ).toBeUndefined();
  });

  it('still opens a legitimate 8 KB link with options', () => {
    const ok = encodeSharePayload({
      mode: 'notebook',
      a: '{}',
      b: '{}',
      options: { similarityThreshold: 0.6 }
    });
    expect(decodeSharePayload('#s=' + ok.compressed)?.options).toEqual({
      similarityThreshold: 0.6
    });
  });

  it('parseDiffBundle applies the same sanitization', () => {
    const bundle = JSON.stringify({ mode: 'text', a: '', b: '', options: { granularity: 'x' } });
    expect(parseDiffBundle(bundle).options).toEqual({});
  });
});
