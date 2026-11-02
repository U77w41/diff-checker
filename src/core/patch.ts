import { createTwoFilesPatch } from 'diff';

/**
 * Generates a unified git-compatible patch string from two text versions.
 * In accordance with Git conventions, both headers use A's file name (or 'file.txt')
 * so that `git apply` applies cleanly to the original file.
 */
export function generateGitPatch(
  fileNameA: string | undefined,
  textA: string,
  textB: string
): string {
  const name = safePatchPath(fileNameA);
  return createTwoFilesPatch(`a/${name}`, `b/${name}`, textA, textB, '', '', { context: 3 });
}

/**
 * Turns an untrusted file name into a safe relative path for patch headers:
 * no leading slash, no "." or ".." segments, no control characters.
 */
export function safePatchPath(name: string | undefined): string {
  const cleaned = (name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const parts: string[] = [];
  for (const segment of cleaned.split(/[\\/]+/)) {
    if (!segment || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.length > 0 ? parts.join('/') : 'file.txt';
}
