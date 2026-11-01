import { describe, it, expect } from 'vitest';
import { decodeFileBuffer } from '../../src/core/file-reader';

describe('File Buffer Decoder & Validation', () => {
  it('decodes clean valid UTF-8 text', () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('Hello World\nLine 2');
    const result = decodeFileBuffer(bytes);

    expect(result.text).toBe('Hello World\nLine 2');
    expect(result.warning).toBeUndefined();
  });

  it('strips leading UTF-8 BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x41, 0x42, 0x43]); // BOM + ABC
    const result = decodeFileBuffer(bytes);

    expect(result.text).toBe('ABC');
  });

  it('handles invalid UTF-8 with replacement chars and warning (Review focus 1)', () => {
    // Windows-1252 byte sequence that is invalid in UTF-8: 0x93 ("smart quote")
    const bytes = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x93, 0x57, 0x6f, 0x72, 0x6c, 0x64
    ]);
    const result = decodeFileBuffer(bytes);

    expect(result.text).toContain('');
    expect(result.warning).toBe(
      "This file isn't valid UTF-8; unreadable characters are shown as ."
    );
  });

  it('detects binary file from null byte in first 8 KB', () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x00, 0x6c, 0x6f]); // 'He\0lo'
    expect(() => decodeFileBuffer(bytes)).toThrowError(
      "This looks like a binary file and can't be compared as text."
    );
  });

  it('allows null byte if it only occurs after first 8 KB', () => {
    const bytes = new Uint8Array(9000);
    bytes.fill(0x61); // 'a'
    bytes[8500] = 0x00; // null byte after 8192 bytes
    const result = decodeFileBuffer(bytes);
    expect(result.text.length).toBe(9000);
  });

  it('warns when file is over 5 MB', () => {
    const bytes = new Uint8Array(6 * 1024 * 1024);
    bytes.fill(0x20); // spaces
    const result = decodeFileBuffer(bytes);
    expect(result.warning).toBe('Large file — the diff may take a few seconds');
  });

  it('refuses file over 50 MB with TOO_LARGE error', () => {
    const bytes = new Uint8Array(51 * 1024 * 1024);
    expect(() => decodeFileBuffer(bytes)).toThrowError('Files over 50 MB are not supported');
  });
});
