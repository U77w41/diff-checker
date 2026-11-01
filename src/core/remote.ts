export const CORS_ERROR_MESSAGE =
  "This site doesn't allow loading from other pages. Download the file and upload it instead.";

export interface RemoteFileResult {
  text: string;
  fileName: string;
}

/**
 * Loads text content from a remote URL.
 * Rejects with standard CORS/network error message when blocked or failing.
 */
export async function fetchRemoteFile(urlStr: string): Promise<RemoteFileResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new Error('Please enter a valid URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid URL: only HTTP and HTTPS are supported.');
  }

  try {
    const res = await fetch(urlStr);
    if (!res.ok) {
      throw new Error(CORS_ERROR_MESSAGE);
    }
    const text = await res.text();

    // Extract filename from URL pathname
    const pathname = parsedUrl.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const fileName = lastSegment && lastSegment.includes('.') ? lastSegment : 'remote-file.txt';

    return { text, fileName };
  } catch (err) {
    if (err instanceof Error && err.message === CORS_ERROR_MESSAGE) {
      throw err;
    }
    throw new Error(CORS_ERROR_MESSAGE);
  }
}
