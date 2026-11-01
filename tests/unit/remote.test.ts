import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRemoteFile, CORS_ERROR_MESSAGE } from '../../src/core/remote';

describe('Load from URL (src/core/remote.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches text successfully and extracts fileName', async () => {
    const mockContent = 'print("hello world")';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockContent
    } as unknown as Response);

    const result = await fetchRemoteFile(
      'https://raw.githubusercontent.com/user/repo/main/script.py'
    );
    expect(result.text).toBe(mockContent);
    expect(result.fileName).toBe('script.py');
  });

  it('falls back to default fileName if URL has no trailing filename', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'some content'
    } as unknown as Response);

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
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    } as unknown as Response);

    await expect(fetchRemoteFile('https://example.com/notfound.txt')).rejects.toThrow(
      CORS_ERROR_MESSAGE
    );
  });

  it('rejects invalid or non-http protocols', async () => {
    await expect(fetchRemoteFile('file:///etc/passwd')).rejects.toThrow(
      'Invalid URL: only HTTP and HTTPS are supported.'
    );
  });
});
