import LZString from 'lz-string';

export const MAX_SHARE_URL_BYTES = 8192; // 8 KB limit

export interface SharePayload {
  mode: 'text' | 'notebook';
  a: string;
  b: string;
  options?: Record<string, unknown>;
  fileNameA?: string;
  fileNameB?: string;
}

export interface EncodeResult {
  compressed: string;
  byteSize: number;
  isTooLarge: boolean;
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

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(raw);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed) as Partial<SharePayload>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.mode !== 'text' && parsed.mode !== 'notebook') return null;
    if (typeof parsed.a !== 'string' || typeof parsed.b !== 'string') return null;

    return {
      mode: parsed.mode,
      a: parsed.a,
      b: parsed.b,
      options: parsed.options,
      fileNameA: parsed.fileNameA,
      fileNameB: parsed.fileNameB
    };
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
  const parsed = JSON.parse(jsonText) as Partial<SharePayload>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid bundle format: expected an object');
  }
  if (parsed.mode !== 'text' && parsed.mode !== 'notebook') {
    throw new Error('Invalid bundle format: unknown mode');
  }
  if (typeof parsed.a !== 'string' || typeof parsed.b !== 'string') {
    throw new Error('Invalid bundle format: missing inputs');
  }

  return {
    mode: parsed.mode,
    a: parsed.a,
    b: parsed.b,
    options: parsed.options,
    fileNameA: parsed.fileNameA,
    fileNameB: parsed.fileNameB
  };
}
