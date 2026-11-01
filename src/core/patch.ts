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
  const name = fileNameA?.trim() ? fileNameA.trim() : 'file.txt';
  return createTwoFilesPatch(`a/${name}`, `b/${name}`, textA, textB, '', '', { context: 3 });
}
