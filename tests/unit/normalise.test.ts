import { describe, it, expect } from 'vitest';
import { normaliseText, stripBOM } from '../../src/core/text-diff/normalise';
import type { DiffOptions } from '../../src/core/text-diff/types';
import { DEFAULT_DIFF_OPTIONS } from '../../src/core/text-diff/types';

describe('Text Normalisation', () => {
  it('strips leading UTF-8 Byte Order Mark (BOM)', () => {
    const withBom = '\uFEFFHello World\nLine 2';
    expect(stripBOM(withBom)).toBe('Hello World\nLine 2');
    const withoutBom = 'Hello World\nLine 2';
    expect(stripBOM(withoutBom)).toBe('Hello World\nLine 2');
  });

  it('splits text into lines with line numbers by default', () => {
    const input = 'line 1\nline 2\r\nline 3';
    const result = normaliseText(input, DEFAULT_DIFF_OPTIONS);

    expect(result.allOriginalLines).toEqual(['line 1', 'line 2', 'line 3']);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]?.originalLineNo).toBe(1);
    expect(result.lines[0]?.text).toBe('line 1');
    expect(result.lines[1]?.originalLineNo).toBe(2);
    expect(result.lines[1]?.text).toBe('line 2');
    expect(result.lines[2]?.originalLineNo).toBe(3);
    expect(result.lines[2]?.text).toBe('line 3');
  });

  it('handles ignoreWhitespace by collapsing spaces/tabs and trimming', () => {
    const input = '  hello \t  world   \n  foo   bar\t';
    const opts: DiffOptions = {
      ...DEFAULT_DIFF_OPTIONS,
      ignoreWhitespace: true
    };
    const result = normaliseText(input, opts);

    expect(result.lines[0]?.text).toBe('hello world');
    expect(result.lines[0]?.original).toBe('  hello \t  world   ');
    expect(result.lines[1]?.text).toBe('foo bar');
    expect(result.lines[1]?.original).toBe('  foo   bar\t');
  });

  it('handles ignoreCase by converting to lowercase', () => {
    const input = 'Hello World\nFoo BAR';
    const opts: DiffOptions = {
      ...DEFAULT_DIFF_OPTIONS,
      ignoreCase: true
    };
    const result = normaliseText(input, opts);

    expect(result.lines[0]?.text).toBe('hello world');
    expect(result.lines[0]?.original).toBe('Hello World');
    expect(result.lines[1]?.text).toBe('foo bar');
    expect(result.lines[1]?.original).toBe('Foo BAR');
  });

  it('handles ignoreBlankLines by leaving them out of comparison sequence', () => {
    const input = 'line 1\n\n   \t  \nline 2';
    const opts: DiffOptions = {
      ...DEFAULT_DIFF_OPTIONS,
      ignoreBlankLines: true
    };
    const result = normaliseText(input, opts);

    expect(result.allOriginalLines).toHaveLength(4);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.originalLineNo).toBe(1);
    expect(result.lines[0]?.text).toBe('line 1');
    expect(result.lines[1]?.originalLineNo).toBe(4);
    expect(result.lines[1]?.text).toBe('line 2');
    expect(result.blankLineIndices.has(1)).toBe(true);
    expect(result.blankLineIndices.has(2)).toBe(true);
  });

  it('handles combined options (ignoreWhitespace + ignoreCase + ignoreBlankLines)', () => {
    const input = '  \n  HELLO   WORLD  \n\t\n  FOO  ';
    const opts: DiffOptions = {
      ignoreWhitespace: true,
      ignoreCase: true,
      ignoreLineEndings: true,
      ignoreBlankLines: true,
      granularity: 'word'
    };
    const result = normaliseText(input, opts);

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.text).toBe('hello world');
    expect(result.lines[0]?.originalLineNo).toBe(2);
    expect(result.lines[1]?.text).toBe('foo');
    expect(result.lines[1]?.originalLineNo).toBe(4);
  });

  it('handles empty string properly', () => {
    const result = normaliseText('', DEFAULT_DIFF_OPTIONS);
    expect(result.allOriginalLines).toEqual([]);
    expect(result.lines).toHaveLength(0);
  });
});
