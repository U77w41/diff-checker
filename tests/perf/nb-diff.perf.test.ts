import { describe, it, expect } from 'vitest';
import { diffNotebook } from '../../src/core/nb-diff/diff';
import { DEFAULT_NB_DIFF_OPTIONS } from '../../src/core/nb-diff/types';
import type { NbCell, Notebook } from '../../src/core/nb-parse/types';

describe('Notebook Diff Performance Benchmark', () => {
  it('diffs a 500-cell notebook pair in under 1 second', () => {
    const numCells = 500;
    const cellsA: NbCell[] = [];

    for (let i = 0; i < numCells; i++) {
      const type = i % 4 === 0 ? 'markdown' : 'code';
      const source =
        type === 'markdown'
          ? `### Section ${i}\nThis describes analysis step number ${i}.`
          : `def process_step_${i}(x):\n    val = x * ${i}\n    return val + math.sqrt(${i})`;

      cellsA.push({
        id: `cell_${i}`,
        type,
        source,
        outputs:
          type === 'code'
            ? [
                {
                  kind: 'stream',
                  name: 'stdout',
                  text: `Step ${i} complete\n`
                }
              ]
            : [],
        executionCount: type === 'code' ? i : null,
        metadata: {}
      });
    }

    const nbA: Notebook = {
      nbformat: 4,
      nbformatMinor: 5,
      metadata: {
        kernelspec: { name: 'python3', display_name: 'Python 3' },
        language_info: { name: 'python', version: '3.11' }
      },
      cells: cellsA
    };

    // Create B with ~10% mutations: edits, additions, deletions, moves
    const cellsB: NbCell[] = [];
    for (let i = 0; i < numCells; i++) {
      if (i % 10 === 0) {
        // Edit cell
        cellsB.push({
          ...cellsA[i]!,
          source: cellsA[i]!.source + '\n# Modified in step B'
        });
      } else if (i % 15 === 0) {
        // Skip cell (deletion in B)
        continue;
      } else if (i % 25 === 0) {
        // Add new cell
        cellsB.push({
          id: `new_cell_${i}`,
          type: 'code',
          source: `new_metric = calculate_${i}()`,
          outputs: [],
          executionCount: 999,
          metadata: {}
        });
        cellsB.push({ ...cellsA[i]! });
      } else {
        cellsB.push({ ...cellsA[i]! });
      }
    }

    // Move a small slice
    if (cellsB.length > 30) {
      const moved = cellsB.splice(10, 5);
      cellsB.splice(20, 0, ...moved);
    }

    const nbB: Notebook = {
      nbformat: 4,
      nbformatMinor: 5,
      metadata: {
        kernelspec: { name: 'python3', display_name: 'Python 3' },
        language_info: { name: 'python', version: '3.11' }
      },
      cells: cellsB
    };

    const start = performance.now();
    const result = diffNotebook(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    const duration = performance.now() - start;

    console.log(`[PERF] 500-cell notebook diff completed in ${duration.toFixed(1)} ms`);

    expect(result.cells.length).toBeGreaterThan(400);
    expect(result.stats.modified).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // 1,000 ms target
  });
});
