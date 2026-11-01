import { describe, it, expect } from 'vitest';
import { diffOutputs } from '../../src/core/nb-diff/output-diff';
import { diffMetadata, diffNotebookHeader } from '../../src/core/nb-diff/metadata-diff';
import type { NbOutput, Notebook } from '../../src/core/nb-parse/types';
import { DEFAULT_NB_DIFF_OPTIONS } from '../../src/core/nb-diff/types';

describe('diffOutputs', () => {
  it('returns same for identical stream outputs', () => {
    const outA: NbOutput[] = [{ kind: 'stream', name: 'stdout', text: 'hello world\n' }];
    const outB: NbOutput[] = [{ kind: 'stream', name: 'stdout', text: 'hello world\n' }];

    const diff = diffOutputs(outA, outB, DEFAULT_NB_DIFF_OPTIONS);
    expect(diff).toEqual([{ kind: 'same' }]);
  });

  it('diffs modified stream outputs with text diff', () => {
    const outA: NbOutput[] = [{ kind: 'stream', name: 'stdout', text: 'hello\n' }];
    const outB: NbOutput[] = [{ kind: 'stream', name: 'stdout', text: 'world\n' }];

    const diff = diffOutputs(outA, outB, DEFAULT_NB_DIFF_OPTIONS);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.kind).toBe('text');
    if (diff[0]?.kind === 'text') {
      expect(diff[0].mime).toBe('text/plain');
      expect(diff[0].diff.identical).toBe(false);
    }
  });

  it('diffs error outputs with ANSI codes stripped', () => {
    const outA: NbOutput[] = [
      {
        kind: 'error',
        ename: 'ValueError',
        evalue: 'invalid literal',
        traceback: ['\u001b[0;31mValueError: invalid literal\u001b[0m']
      }
    ];
    const outB: NbOutput[] = [
      {
        kind: 'error',
        ename: 'TypeError',
        evalue: 'bad operand',
        traceback: ['\u001b[0;31mTypeError: bad operand\u001b[0m']
      }
    ];

    const diff = diffOutputs(outA, outB, DEFAULT_NB_DIFF_OPTIONS);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.kind).toBe('text');
  });

  it('diffs image outputs via base64 equality', () => {
    const imgA =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgB =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const outA: NbOutput[] = [
      {
        kind: 'rich',
        outputType: 'display_data',
        data: { 'image/png': imgA },
        metadata: {}
      }
    ];
    const outB: NbOutput[] = [
      {
        kind: 'rich',
        outputType: 'display_data',
        data: { 'image/png': imgB },
        metadata: {}
      }
    ];

    const diff = diffOutputs(outA, outB, DEFAULT_NB_DIFF_OPTIONS);
    expect(diff).toEqual([{ kind: 'image', mime: 'image/png', a: imgA, b: imgB }]);
  });

  it('handles positional additions and removals of outputs', () => {
    const outA: NbOutput[] = [{ kind: 'stream', name: 'stdout', text: 'first\n' }];
    const outB: NbOutput[] = [
      { kind: 'stream', name: 'stdout', text: 'first\n' },
      { kind: 'stream', name: 'stderr', text: 'second\n' }
    ];

    const diff = diffOutputs(outA, outB, DEFAULT_NB_DIFF_OPTIONS);
    expect(diff).toHaveLength(2);
    expect(diff[0]?.kind).toBe('same');
    expect(diff[1]?.kind).toBe('added');
  });
});

describe('diffMetadata', () => {
  it('diffs added, removed, and changed keys', () => {
    const metaA = { foo: 1, bar: 'hello', obj: { x: 1 } };
    const metaB = { foo: 2, obj: { x: 1 }, extra: true };

    const diff = diffMetadata(metaA, metaB, false);
    expect(diff.changed).toEqual({ foo: { a: 1, b: 2 } });
    expect(diff.removed).toEqual({ bar: 'hello' });
    expect(diff.added).toEqual({ extra: true });
    expect(diff.hiddenKeys).toEqual([]);
  });

  it('suppresses noisy metadata keys when hideNoisyMetadata is true', () => {
    const metaA = {
      collapsed: true,
      scrolled: false,
      jupyter: { source_hidden: true },
      normal: 10
    };
    const metaB = { collapsed: false, ExecuteTime: { end_time: '12:00' }, normal: 20 };

    const diff = diffMetadata(metaA, metaB, true);
    expect(diff.changed).toEqual({ normal: { a: 10, b: 20 } });
    expect(diff.hiddenKeys).toContain('collapsed');
    expect(diff.hiddenKeys).toContain('scrolled');
    expect(diff.hiddenKeys).toContain('jupyter');
    expect(diff.hiddenKeys).toContain('ExecuteTime');
  });
});

describe('diffNotebookHeader', () => {
  it('detects changes in kernelspec, language_info, and nbformat', () => {
    const nbA: Notebook = {
      nbformat: 4,
      nbformatMinor: 2,
      metadata: {
        kernelspec: { name: 'python3', display_name: 'Python 3' },
        language_info: { name: 'python', version: '3.9.0' }
      },
      cells: []
    };
    const nbB: Notebook = {
      nbformat: 4,
      nbformatMinor: 5,
      metadata: {
        kernelspec: { name: 'ir', display_name: 'R' },
        language_info: { name: 'R', version: '4.2.0' }
      },
      cells: []
    };

    const header = diffNotebookHeader(nbA, nbB);
    const fields = header.map((h) => h.field);
    expect(fields).toContain('kernelspec.name');
    expect(fields).toContain('language_info.name');
    expect(fields).toContain('language_info.version');
    expect(fields).toContain('nbformat');
  });
});
