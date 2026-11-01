import { describe, it, expect } from 'vitest';
import { alignNotebooks } from '../../src/core/nb-align/align';
import type { NbCell, Notebook } from '../../src/core/nb-parse/types';
import type { NbDiffOptions } from '../../src/core/nb-diff/types';
import { DEFAULT_NB_DIFF_OPTIONS } from '../../src/core/nb-diff/types';

function createMockNotebook(cells: Partial<NbCell>[]): Notebook {
  return {
    nbformat: 4,
    nbformatMinor: 5,
    metadata: {},
    cells: cells.map((c, i) => ({
      id: c.id,
      type: c.type ?? 'code',
      source: c.source ?? `cell_${i}`,
      outputs: c.outputs ?? [],
      executionCount: c.executionCount ?? null,
      metadata: c.metadata ?? {}
    }))
  };
}

describe('alignNotebooks (4-pass cell matching)', () => {
  it('Pass 1 & 2: aligns identical notebooks with unchanged cells in exact order', () => {
    const nbA = createMockNotebook([
      { id: 'c1', source: 'x = 1' },
      { id: 'c2', source: 'y = 2' }
    ]);
    const nbB = createMockNotebook([
      { id: 'c1', source: 'x = 1' },
      { id: 'c2', source: 'y = 2' }
    ]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result).toHaveLength(2);
    expect(result[0]?.op).toEqual({ op: 'unchanged', a: 0, b: 0 });
    expect(result[1]?.op).toEqual({ op: 'unchanged', a: 1, b: 1 });
  });

  it('Pass 1: pairs cells by matching ID as anchors even if edited', () => {
    const nbA = createMockNotebook([
      { id: 'c1', source: 'df.plot()' },
      { id: 'c2', source: 'print("done")' }
    ]);
    const nbB = createMockNotebook([
      { id: 'c1', source: 'df.plot(kind="bar")' },
      { id: 'c2', source: 'print("done")' }
    ]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result).toHaveLength(2);
    expect(result[0]?.op.op).toBe('modified');
    if (result[0]?.op.op === 'modified') {
      expect(result[0].op.a).toBe(0);
      expect(result[0].op.b).toBe(0);
      expect(result[0].op.similarity).toBeCloseTo(0.67, 2);
    }
    expect(result[1]?.op).toEqual({ op: 'unchanged', a: 1, b: 1 });
  });

  it('Pass 2: matches exact cells via LCS when IDs are missing or different', () => {
    const nbA = createMockNotebook([
      { source: 'a = 1' },
      { source: 'deleted_1 = 2' },
      { source: 'deleted_2 = 3' },
      { source: 'c = 3' }
    ]);
    const nbB = createMockNotebook([
      { source: 'a = 1' },
      { source: 'added_1 = 99' },
      { source: 'c = 3' }
    ]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    const ops = result.map((r) => r.op.op);
    expect(ops).toContain('unchanged');
    expect(ops).toContain('deleted');
    expect(ops).toContain('added');
  });

  it('Pass 3: pairs 1-to-1 gap cells as modified even with type change', () => {
    const nbA = createMockNotebook([
      { id: 'top', source: 'top' },
      { type: 'markdown', source: '# Notes' },
      { id: 'bot', source: 'bot' }
    ]);
    const nbB = createMockNotebook([
      { id: 'top', source: 'top' },
      { type: 'code', source: '# Notes in code' },
      { id: 'bot', source: 'bot' }
    ]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result).toHaveLength(3);
    expect(result[1]?.op.op).toBe('modified');
    expect(result[1]?.typeChanged).toEqual({ from: 'markdown', to: 'code' });
  });

  it('Pass 3: pairs same-type cells greedily by token similarity >= threshold (0.5)', () => {
    const nbA = createMockNotebook([
      { id: 'top', source: 'top' },
      { source: 'import pandas as pd' }, // sim 0.50 with import numpy as np
      { id: 'bot', source: 'bot' }
    ]);
    const nbB = createMockNotebook([
      { id: 'top', source: 'top' },
      { source: 'import numpy as np' },
      { id: 'bot', source: 'bot' }
    ]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result[1]?.op.op).toBe('modified');
    if (result[1]?.op.op === 'modified') {
      expect(result[1].op.similarity).toBeCloseTo(0.5, 2);
    }
  });

  it('Pass 3: rejects modified pairing if similarity is below threshold', () => {
    // Threshold = 0.5
    const opts: NbDiffOptions = {
      ...DEFAULT_NB_DIFF_OPTIONS,
      similarityThreshold: 0.5
    };

    // When gap has 1 cell on each side, the spec says:
    // "If the gap has exactly one cell on each side, pair them as modified"
    // So 1-to-1 gap is paired. Let's test with a 2-cell gap to test greedy threshold!
    const nbA2 = createMockNotebook([
      { id: 'top', source: 'top' },
      { source: 'x = 1' },
      { source: 'foo = "bar"' },
      { id: 'bot', source: 'bot' }
    ]);
    const nbB2 = createMockNotebook([
      { id: 'top', source: 'top' },
      { source: 'y = 2' }, // sim(x=1, y=2) = 0.33 < 0.5
      { source: 'completely_different = 99' },
      { id: 'bot', source: 'bot' }
    ]);

    const res2 = alignNotebooks(nbA2, nbB2, opts);
    const middleOps = res2.slice(1, -1).map((r) => r.op.op);
    // Neither pair reaches 0.5, so they become deleted and added, NOT modified!
    expect(middleOps).not.toContain('modified');
    expect(middleOps).toContain('deleted');
    expect(middleOps).toContain('added');
  });

  it('Pass 4: detects moved cells with identical match keys', () => {
    const nbA = createMockNotebook([
      { source: 'header' },
      { source: 'moved_cell' },
      { source: 'footer' }
    ]);
    const nbB = createMockNotebook([
      { source: 'header' },
      { source: 'footer' },
      { source: 'moved_cell' }
    ]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result).toHaveLength(3);
    const ops = result.map((r) => r.op.op);
    expect(ops.filter((op) => op === 'unchanged')).toHaveLength(2);
    expect(ops.filter((op) => op === 'moved')).toHaveLength(1);

    const moved = result.find((r) => r.op.op === 'moved');
    expect(moved?.op.op).toBe('moved');
  });

  it('Output Ordering: deleted cells without earlier partner appear at the very beginning', () => {
    const nbA = createMockNotebook([{ source: 'deleted_header' }, { source: 'shared_body' }]);
    const nbB = createMockNotebook([{ source: 'shared_body' }]);

    const result = alignNotebooks(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result).toHaveLength(2);
    expect(result[0]?.op).toEqual({ op: 'deleted', a: 0 });
    expect(result[1]?.op).toEqual({ op: 'unchanged', a: 1, b: 0 });
  });
});
