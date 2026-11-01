import { describe, it, expect } from 'vitest';
import { generateGitPatch } from '../../src/core/patch';

describe('Patch Generation for git apply', () => {
  it('uses file name A for both headers', () => {
    const textA = 'def hello():\n    print("old")\n';
    const textB = 'def hello():\n    print("new")\n';
    const patch = generateGitPatch('script.py', textA, textB);

    expect(patch).toContain('--- a/script.py');
    expect(patch).toContain('+++ b/script.py');
    expect(patch).toContain('-    print("old")');
    expect(patch).toContain('+    print("new")');
  });

  it('falls back to file.txt when no filename is given', () => {
    const textA = 'line 1\n';
    const textB = 'line 1\nline 2\n';
    const patch = generateGitPatch(undefined, textA, textB);

    expect(patch).toContain('--- a/file.txt');
    expect(patch).toContain('+++ b/file.txt');
  });
});
