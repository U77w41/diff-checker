import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { diffNotebook } from '../../src/core/nb-diff/diff';
import type { Notebook, NbCell, NbOutput } from '../../src/core/nb-parse/types';
import { DEFAULT_NB_DIFF_OPTIONS } from '../../src/core/nb-diff/types';

const cellGen = fc.record({
  id: fc.option(fc.stringMatching(/^[a-z0-9_-]{1,10}$/), { nil: undefined }),
  type: fc.constantFrom<'code' | 'markdown' | 'raw'>('code', 'markdown', 'raw'),
  source: fc.string({ maxLength: 100 }),
  outputs: fc.constant<NbOutput[]>([]),
  executionCount: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  metadata: fc.constant({})
});

const notebookGen = fc
  .record({
    nbformat: fc.constant(4),
    nbformatMinor: fc.integer({ min: 0, max: 5 }),
    metadata: fc.constant({}),
    cells: fc.array(cellGen, { maxLength: 15 })
  })
  .map((rawNb) => {
    // Ensure IDs are unique within the notebook if generated
    const seen = new Set<string>();
    const cells: NbCell[] = [];
    for (const c of rawNb.cells) {
      let id = c.id;
      if (id && seen.has(id)) {
        id = undefined;
      } else if (id) {
        seen.add(id);
      }
      cells.push({ ...c, id });
    }
    return { ...rawNb, cells } as Notebook;
  });

describe('Notebook Diff Property Tests (fast-check)', () => {
  it('diffing any valid notebook against itself produces identical/unchanged results', () => {
    fc.assert(
      fc.property(notebookGen, (nb) => {
        const result = diffNotebook(nb, nb, DEFAULT_NB_DIFF_OPTIONS);
        expect(result.stats.added).toBe(0);
        expect(result.stats.deleted).toBe(0);
        expect(result.stats.modified).toBe(0);
        expect(result.stats.moved).toBe(0);
        expect(result.stats.unchanged).toBe(nb.cells.length);
        expect(result.cells.every((c) => c.op.op === 'unchanged')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('preserves cell count conservation: A cells and B cells are accounted for exactly', () => {
    fc.assert(
      fc.property(notebookGen, notebookGen, (nbA, nbB) => {
        const result = diffNotebook(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);

        // Every cell in B is accounted for
        const totalB =
          result.stats.added + result.stats.modified + result.stats.unchanged + result.stats.moved;
        expect(totalB).toBe(nbB.cells.length);

        // Every cell in A is accounted for
        const totalA =
          result.stats.deleted +
          result.stats.modified +
          result.stats.unchanged +
          result.stats.moved;
        expect(totalA).toBe(nbA.cells.length);

        // Output cell count in diff result is |B| + |deleted|
        expect(result.cells.length).toBe(nbB.cells.length + result.stats.deleted);
      }),
      { numRuns: 100 }
    );
  });
});
