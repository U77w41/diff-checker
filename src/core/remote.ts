import { DiffError, decodeFileBuffer, MAX_FILE_SIZE } from './file-reader';

export const CORS_ERROR_MESSAGE =
  "This site doesn't allow loading from other pages. Download the file and upload it instead.";

export const REMOTE_TOO_LARGE_MESSAGE =
  'This file is larger than 50 MB. Download it and upload it instead.';

export interface RemoteFileResult {
  text: string;
  fileName: string;
}

class TooLargeError extends Error {
  constructor() {
    super(REMOTE_TOO_LARGE_MESSAGE);
  }
}

/** Reads a response body, stopping as soon as it passes MAX_FILE_SIZE. */
async function readCapped(res: Response): Promise<Uint8Array> {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_FILE_SIZE) throw new TooLargeError();
  if (!res.body) return new Uint8Array(await res.arrayBuffer());

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FILE_SIZE) {
      await reader.cancel();
      throw new TooLargeError();
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Loads text content from a remote HTTPS URL, without cookies or referrer, up to 50 MB.
 * Rejects with standard CORS/network error message when blocked or failing.
 */
export async function fetchRemoteFile(urlStr: string): Promise<RemoteFileResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new Error('Please enter a valid URL.');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid URL: only HTTPS is supported.');
  }

  try {
    const res = await fetch(parsedUrl.href, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
    if (!res.ok) {
      throw new Error(CORS_ERROR_MESSAGE);
    }
    const { text } = decodeFileBuffer(await readCapped(res));

    // Extract filename from URL pathname
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const fileName = lastSegment && lastSegment.includes('.') ? lastSegment : 'remote-file.txt';

    return { text, fileName };
  } catch (err) {
    if (err instanceof TooLargeError || err instanceof DiffError) throw err;
    if (err instanceof Error && err.message === CORS_ERROR_MESSAGE) throw err;
    throw new Error(CORS_ERROR_MESSAGE);
  }
}
