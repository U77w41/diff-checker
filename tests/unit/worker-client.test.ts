import { describe, it, expect } from 'vitest';
import { workerManager } from '../../src/worker/worker-client';
import { DEFAULT_DIFF_OPTIONS } from '../../src/core/text-diff/types';
import { DEFAULT_NB_DIFF_OPTIONS } from '../../src/core/nb-diff/types';

describe('workerManager', () => {
  it('diffs text through workerManager (with fallback in test environment)', async () => {
    const res = await workerManager.diffText('hello', 'world', DEFAULT_DIFF_OPTIONS);
    expect(res.identical).toBe(false);
    expect(res.stats).toEqual({ added: 1, removed: 1 });
  });

  it('diffs notebooks through workerManager (with fallback in test environment)', async () => {
    const nbA = JSON.stringify({
      nbformat: 4,
      cells: [{ cell_type: 'code', source: 'x = 1' }]
    });
    const nbB = JSON.stringify({
      nbformat: 4,
      cells: [{ cell_type: 'code', source: 'x = 2' }]
    });

    const res = await workerManager.diffNotebook(nbA, nbB, DEFAULT_NB_DIFF_OPTIONS);
    expect(res.stats.modified).toBe(1);
    expect(res.cells[0]?.op.op).toBe('modified');
  });
});
