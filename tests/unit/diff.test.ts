import { describe, it, expect } from 'vitest';
import { diffText, applyChanges } from '../../src/core/text-diff/diff';
import type { DiffOptions } from '../../src/core/text-diff/types';
import { DEFAULT_DIFF_OPTIONS } from '../../src/core/text-diff/types';

describe('Text Diff Core', () => {
  it('returns identical for identical strings', () => {
    const text = 'line 1\nline 2\nline 3\n';
    const result = diffText(text, text, DEFAULT_DIFF_OPTIONS);

    expect(result.identical).toBe(true);
    expect(result.changes).toHaveLength(0);
    expect(result.hunks).toHaveLength(0);
    expect(result.stats).toEqual({ added: 0, removed: 0 });
  });

  it('returns identical for CRLF vs LF with default ignoreLineEndings', () => {
    const textA = 'line 1\r\nline 2\r\n';
    const textB = 'line 1\nline 2\n';
    const result = diffText(textA, textB, DEFAULT_DIFF_OPTIONS);

    expect(result.identical).toBe(true);
  });

  it('returns identical with ignoreWhitespace and ignoreCase when applicable', () => {
    const textA = '  HELLO   WORLD  \n';
    const textB = 'hello world\n';
    const opts: DiffOptions = {
      ...DEFAULT_DIFF_OPTIONS,
      ignoreWhitespace: true,
      ignoreCase: true
    };
    const result = diffText(textA, textB, opts);

    expect(result.identical).toBe(true);
  });

  it('detects simple line additions and deletions', () => {
    const textA = 'line 1\nline 2\n';
    const textB = 'line 1\nline added\nline 2\n';
    const result = diffText(textA, textB, DEFAULT_DIFF_OPTIONS);

    expect(result.identical).toBe(false);
    expect(result.stats.added).toBe(1);
    expect(result.stats.removed).toBe(0);
    expect(result.hunks).toHaveLength(1);
    expect(applyChanges(textA, textB, result.changes)).toBe(textB);
  });

  it('computes word-level intra-line spans for paired lines', () => {
    const textA = 'hello beautiful world';
    const textB = 'hello magnificent world';
    const result = diffText(textA, textB, {
      ...DEFAULT_DIFF_OPTIONS,
      granularity: 'word'
    });

    expect(result.identical).toBe(false);
    expect(result.hunks).toHaveLength(1);
    const hunk = result.hunks[0]!;
    const delLine = hunk.lines.find((l) => l.kind === 'del');
    const addLine = hunk.lines.find((l) => l.kind === 'add');

    expect(delLine?.inline).toBeDefined();
    expect(addLine?.inline).toBeDefined();
    expect(delLine?.inline?.[0]?.kind).toBe('del');
    expect(addLine?.inline?.[0]?.kind).toBe('add');
    expect(applyChanges(textA, textB, result.changes)).toBe(textB);
  });

  it('handles emoji without splitting code points in character mode (Review focus 2)', () => {
    const textA = 'a😀b';
    const textB = 'a😁b';
    const result = diffText(textA, textB, {
      ...DEFAULT_DIFF_OPTIONS,
      granularity: 'char'
    });

    expect(result.identical).toBe(false);
    const hunk = result.hunks[0]!;
    const delLine = hunk.lines.find((l) => l.kind === 'del')!;
    const addLine = hunk.lines.find((l) => l.kind === 'add')!;

    // '😀' and '😁' are 2 UTF-16 code units starting at index 1
    expect(delLine.inline).toEqual([{ from: 1, to: 3, kind: 'del' }]);
    expect(addLine.inline).toEqual([{ from: 1, to: 3, kind: 'add' }]);
    expect(applyChanges(textA, textB, result.changes)).toBe(textB);
  });

  it('skips intra-line highlighting for lines longer than 10,000 chars (Review focus 3)', () => {
    const prefix = 'x'.repeat(10005);
    const textA = prefix + 'A';
    const textB = prefix + 'B';

    const result = diffText(textA, textB, DEFAULT_DIFF_OPTIONS);
    expect(result.identical).toBe(false);
    const hunk = result.hunks[0]!;
    const delLine = hunk.lines.find((l) => l.kind === 'del')!;
    const addLine = hunk.lines.find((l) => l.kind === 'add')!;

    // Skipped intra-line highlighting
    expect(delLine.inline).toBeUndefined();
    expect(addLine.inline).toBeUndefined();
    expect(applyChanges(textA, textB, result.changes)).toBe(textB);
  });

  it('creates hunks with 3 lines of context', () => {
    const textA = [
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
      'change A',
      'c6',
      'c7',
      'c8',
      'c9',
      'c10',
      'c11',
      'c12',
      'change B',
      'c13',
      'c14',
      'c15',
      'c16',
      'c17'
    ].join('\n');

    const textB = [
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
      'modified A',
      'c6',
      'c7',
      'c8',
      'c9',
      'c10',
      'c11',
      'c12',
      'modified B',
      'c13',
      'c14',
      'c15',
      'c16',
      'c17'
    ].join('\n');

    const result = diffText(textA, textB, DEFAULT_DIFF_OPTIONS);
    // Should be split into 2 separate hunks because context gap is 7 lines (> 6)
    expect(result.hunks.length).toBe(2);
    expect(applyChanges(textA, textB, result.changes)).toBe(textB);
  });
});
