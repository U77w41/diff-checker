const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Computes the 32-bit FNV-1a hash of a UTF-8 string, returning an 8-character lowercase hex string.
 */
export function fnv1a(str: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      hash ^= code;
      hash = Math.imul(hash, FNV_PRIME);
    } else if (code < 0x800) {
      hash ^= 0xc0 | (code >> 6);
      hash = Math.imul(hash, FNV_PRIME);
      hash ^= 0x80 | (code & 0x3f);
      hash = Math.imul(hash, FNV_PRIME);
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      // Surrogate pair for astral code points
      const next = str.charCodeAt(++i);
      const cp = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
      hash ^= 0xf0 | (cp >> 18);
      hash = Math.imul(hash, FNV_PRIME);
      hash ^= 0x80 | ((cp >> 12) & 0x3f);
      hash = Math.imul(hash, FNV_PRIME);
      hash ^= 0x80 | ((cp >> 6) & 0x3f);
      hash = Math.imul(hash, FNV_PRIME);
      hash ^= 0x80 | (cp & 0x3f);
      hash = Math.imul(hash, FNV_PRIME);
    } else {
      hash ^= 0xe0 | (code >> 12);
      hash = Math.imul(hash, FNV_PRIME);
      hash ^= 0x80 | ((code >> 6) & 0x3f);
      hash = Math.imul(hash, FNV_PRIME);
      hash ^= 0x80 | (code & 0x3f);
      hash = Math.imul(hash, FNV_PRIME);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
