import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchRemoteFile,
  CORS_ERROR_MESSAGE,
  REMOTE_TOO_LARGE_MESSAGE
} from '../../src/core/remote';
import { MAX_FILE_SIZE } from '../../src/core/file-reader';

const MiB = 1024 * 1024;
function streamOfBytes(n: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= n) return controller.close();
      const size = Math.min(MiB, n - sent);
      controller.enqueue(new Uint8Array(size).fill(97));
      sent += size;
    }
  });
}

describe('Load from URL (src/core/remote.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches text successfully and extracts fileName', async () => {
    const mockContent = 'print("hello world")';
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(mockContent));

    const result = await fetchRemoteFile(
      'https://raw.githubusercontent.com/user/repo/main/script.py'
    );
    expect(result.text).toBe(mockContent);
    expect(result.fileName).toBe('script.py');
  });

  it('falls back to default fileName if URL has no trailing filename', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('some content'));

    const result = await fetchRemoteFile('https://example.com/');
    expect(result.fileName).toBe('remote-file.txt');
  });

  it('throws friendly CORS error message when network/CORS error occurs', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchRemoteFile('https://forbidden-cors.com/file.txt')).rejects.toThrow(
      CORS_ERROR_MESSAGE
    );
  });

  it('throws friendly CORS error message when HTTP response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }));

    await expect(fetchRemoteFile('https://example.com/notfound.txt')).rejects.toThrow(
      CORS_ERROR_MESSAGE
    );
  });

  it('rejects invalid or non-https protocols', async () => {
    await expect(fetchRemoteFile('file:///etc/passwd')).rejects.toThrow(
      'Invalid URL: only HTTPS is supported.'
    );
  });

  it('rejects http:', async () => {
    await expect(fetchRemoteFile('http://example.com/a.py')).rejects.toThrow(/HTTPS/);
  });

  it('fetches without credentials or referrer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('x'));
    globalThis.fetch = fetchMock;
    await fetchRemoteFile('https://raw.githubusercontent.com/o/r/main/a.py');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' })
    );
  });

  it('aborts once the body passes MAX_FILE_SIZE', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(streamOfBytes(MAX_FILE_SIZE + 1)));
    await expect(fetchRemoteFile('https://x.test/big.txt')).rejects.toThrow(
      REMOTE_TOO_LARGE_MESSAGE
    );
  });

  it('accepts a body just under the cap', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(streamOfBytes(MAX_FILE_SIZE - 1)));
    await expect(fetchRemoteFile('https://x.test/ok.txt')).resolves.toMatchObject({
      fileName: 'ok.txt'
    });
  });
});
