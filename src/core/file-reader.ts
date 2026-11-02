export class DiffError extends Error {
  code: 'BINARY' | 'INVALID_JSON' | 'UNSUPPORTED_NBFORMAT' | 'TOO_LARGE' | 'CANCELLED';
  line?: number;
  column?: number;

  constructor(
    code: 'BINARY' | 'INVALID_JSON' | 'UNSUPPORTED_NBFORMAT' | 'TOO_LARGE' | 'CANCELLED',
    message: string,
    line?: number,
    column?: number
  ) {
    super(message);
    this.name = 'DiffError';
    this.code = code;
    this.line = line;
    this.column = column;
  }
}

export interface DecodedFile {
  text: string;
  warning?: string;
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5 MB
const BINARY_CHECK_BYTES = 8192; // 8 KB

export function decodeFileBuffer(buffer: Uint8Array): DecodedFile {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new DiffError('TOO_LARGE', 'Files over 50 MB are not supported');
  }

  // Check for null bytes in the first 8 KB
  const checkLimit = Math.min(buffer.length, BINARY_CHECK_BYTES);
  for (let i = 0; i < checkLimit; i++) {
    if (buffer[i] === 0) {
      throw new DiffError('BINARY', "This looks like a binary file and can't be compared as text.");
    }
  }

  let text = '';
  let warning: string | undefined;

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    text = decoder.decode(buffer);
  } catch {
    const fallbackDecoder = new TextDecoder('utf-8', { fatal: false });
    text = fallbackDecoder.decode(buffer);
    warning = "This file isn't valid UTF-8; unreadable characters are shown as .";
  }

  // Strip leading UTF-8 Byte Order Mark (BOM) if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  if (!warning && buffer.length > LARGE_FILE_THRESHOLD) {
    warning = 'Large file — the diff may take a few seconds';
  }

  return { text, warning };
}
