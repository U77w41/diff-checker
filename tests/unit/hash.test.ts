import { describe, it, expect } from 'vitest';
import { fnv1a } from '../../src/core/hash';

describe('FNV-1a 32-bit hash', () => {
  it('computes expected hash for empty string (offset basis)', () => {
    expect(fnv1a('')).toBe('811c9dc5');
  });

  it('computes standard test vectors', () => {
    expect(fnv1a('a')).toBe('e40c292c');
    expect(fnv1a('foobar')).toBe('bf9cf968');
  });

  it('is deterministic', () => {
    const text = 'code cell content with print("hello world")';
    expect(fnv1a(text)).toBe(fnv1a(text));
  });

  it('distinguishes different inputs', () => {
    expect(fnv1a('cell A')).not.toBe(fnv1a('cell B'));
  });

  it('handles Unicode and astral surrogate pair characters properly', () => {
    const hash = fnv1a('café ✨ Python 🐍 🎨');
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(8);
  });
});
