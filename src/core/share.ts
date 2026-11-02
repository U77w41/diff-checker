import LZString from 'lz-string';
import type { NbDiffOptions } from './nb-diff/types';

export const MAX_SHARE_URL_BYTES = 8192; // 8 KB limit
/** Links longer than this are refused before decompression (2x the encoder's limit). */
export const MAX_SHARE_ENCODED_CHARS = 16384;
/** Decompressed JSON longer than this is refused (guards against LZ "bombs"). */
export const MAX_SHARE_DECODED_CHARS = 10 * 1024 * 1024;
const MAX_FILE_NAME_CHARS = 255;

export interface SharePayload {
  mode: 'text' | 'notebook';
  a: string;
  b: string;
  options?: Partial<NbDiffOptions>;
  fileNameA?: string;
  fileNameB?: string;
}

export interface EncodeResult {
  compressed: string;
  byteSize: number;
  isTooLarge: boolean;
}

const TEXT_FLAG_KEYS = [
  'ignoreWhitespace',
  'ignoreCase',
  'ignoreLineEndings',
  'ignoreBlankLines'
] as const;
const NOTEBOOK_FLAG_KEYS = ['hideExecutionCount', 'hideNoisyMetadata', 'includeOutputs'] as const;
const SIMILARITY_RANGE = { min: 0.3, max: 0.9 }; // matches the slider in NbFilterBar

/**
 * Keeps only known option keys with valid types. Share links and bundles are untrusted.
 */
export function sanitizeShareOptions(
  mode: 'text' | 'notebook',
  raw: unknown
): Partial<NbDiffOptions> {
  const out: Partial<NbDiffOptions> = {};
  if (!raw || typeof raw !== 'object') return out;
  const src = raw as Record<string, unknown>;

  const flags = mode === 'notebook' ? [...TEXT_FLAG_KEYS, ...NOTEBOOK_FLAG_KEYS] : TEXT_FLAG_KEYS;
  for (const key of flags) {
    if (typeof src[key] === 'boolean') out[key] = src[key];
  }
  if (src.granularity === 'word' || src.granularity === 'char') {
    out.granularity = src.granularity;
  }
  const t = src.similarityThreshold;
  if (
    mode === 'notebook' &&
    typeof t === 'number' &&
    Number.isFinite(t) &&
    t >= SIMILARITY_RANGE.min &&
    t <= SIMILARITY_RANGE.max
  ) {
    out.similarityThreshold = t;
  }
  return out;
}

function sanitizeFileName(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.length <= MAX_FILE_NAME_CHARS ? raw : undefined;
}

function validatePayload(parsed: unknown): SharePayload | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (p.mode !== 'text' && p.mode !== 'notebook') return null;
  if (typeof p.a !== 'string' || typeof p.b !== 'string') return null;
  return {
    mode: p.mode,
    a: p.a,
    b: p.b,
    options: p.options === undefined ? undefined : sanitizeShareOptions(p.mode, p.options),
    fileNameA: sanitizeFileName(p.fileNameA),
    fileNameB: sanitizeFileName(p.fileNameB)
  };
}

/**
 * Encodes a diff payload with LZ-string for share links.
 */
export function encodeSharePayload(payload: SharePayload): EncodeResult {
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const byteSize = new Blob([compressed]).size;
  return {
    compressed,
    byteSize,
    isTooLarge: byteSize > MAX_SHARE_URL_BYTES
  };
}

/**
 * Decodes a share link hash (e.g. #s=<data> or raw <data>) into a SharePayload.
 * Returns null if corrupt or invalid.
 */
export function decodeSharePayload(hashOrData: string): SharePayload | null {
  if (!hashOrData) return null;

  let raw = hashOrData;
  if (raw.startsWith('#s=')) {
    raw = raw.slice(3);
  } else if (raw.startsWith('s=')) {
    raw = raw.slice(2);
  } else if (raw.startsWith('#')) {
    // Other hashes like #text or #notebook
    return null;
  }

  if (!raw) return null;

  if (raw.length > MAX_SHARE_ENCODED_CHARS) return null;

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(raw);
    if (!decompressed || decompressed.length > MAX_SHARE_DECODED_CHARS) return null;
    return validatePayload(JSON.parse(decompressed));
  } catch {
    return null;
  }
}

/**
 * Serializes a diff payload as a JSON bundle for file export/download.
 */
export function createDiffBundle(payload: SharePayload): string {
  return JSON.stringify(
    {
      format: 'diff-checker-bundle-v1',
      createdAt: new Date().toISOString(),
      ...payload
    },
    null,
    2
  );
}

/**
 * Parses and validates a JSON diff bundle file.
 * Throws if invalid or missing required fields.
 */
export function parseDiffBundle(jsonText: string): SharePayload {
  const parsed: unknown = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid bundle format: expected an object');
  }
  const { mode, a, b } = parsed as Record<string, unknown>;
  if (mode !== 'text' && mode !== 'notebook') {
    throw new Error('Invalid bundle format: unknown mode');
  }
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new Error('Invalid bundle format: missing inputs');
  }
  return validatePayload(parsed) as SharePayload;
}
