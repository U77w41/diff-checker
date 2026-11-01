import { describe, it, expect } from 'vitest';
import {
  encodeSharePayload,
  decodeSharePayload,
  createDiffBundle,
  parseDiffBundle,
  MAX_SHARE_URL_BYTES,
  type SharePayload
} from '../../src/core/share';

describe('Share Links & Bundle Persistence (src/core/share.ts)', () => {
  const samplePayload: SharePayload = {
    mode: 'text',
    a: 'const x = 1;\nconsole.log(x);',
    b: 'const x = 2;\nconsole.log(x);',
    fileNameA: 'a.js',
    fileNameB: 'b.js',
    options: { ignoreWhitespace: false, granularity: 'lines' }
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
