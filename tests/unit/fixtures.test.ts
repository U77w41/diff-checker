import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { diffNotebook } from '../../src/core/nb-diff/diff';
import { DEFAULT_NB_DIFF_OPTIONS } from '../../src/core/nb-diff/types';

function readFixture(name: string): string {
  const p = path.resolve(__dirname, '../fixtures/notebooks', name);
  return fs.readFileSync(p, 'utf-8');
}

describe('Golden Notebook Fixtures (6 pairs)', () => {
  it('Pair 1: identical notebooks produce all unchanged cells and zero mutations', () => {
    const rawA = readFixture('identical-a.ipynb');
    const rawB = readFixture('identical-b.ipynb');

    const result = diffNotebook(rawA, rawB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result.stats).toEqual({
      added: 0,
      deleted: 0,
      modified: 0,
      moved: 0,
      unchanged: 2
    });
    expect(result.header).toHaveLength(0);
    expect(result.cells.every((c) => c.op.op === 'unchanged')).toBe(true);
  });

  it('Pair 2: cell-types handles modified markdown, type changes, added raw, and deleted code', () => {
    const rawA = readFixture('cell-types-a.ipynb');
    const rawB = readFixture('cell-types-b.ipynb');

    const result = diffNotebook(rawA, rawB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result.stats.added).toBe(1);
    expect(result.stats.deleted).toBe(2);
    expect(result.stats.modified).toBe(2);

    const typeChangedCell = result.cells.find((c) => c.typeChanged !== undefined);
    expect(typeChangedCell).toBeDefined();
    expect(typeChangedCell?.typeChanged).toEqual({ from: 'code', to: 'markdown' });
  });

  it('Pair 3: cell-moves correctly detects moved cells across the notebook', () => {
    const rawA = readFixture('cell-moves-a.ipynb');
    const rawB = readFixture('cell-moves-b.ipynb');

    const result = diffNotebook(rawA, rawB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result.stats.moved).toBeGreaterThan(0);
    const moved = result.cells.filter((c) => c.op.op === 'moved');
    expect(moved.length).toBeGreaterThanOrEqual(1);
  });

  it('Pair 4: plots-and-images diffs png/svg/html outputs', () => {
    const rawA = readFixture('plots-and-images-a.ipynb');
    const rawB = readFixture('plots-and-images-b.ipynb');

    const result = diffNotebook(rawA, rawB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result.cells).toHaveLength(3);

    // Plot 1 is identical
    const plot1 = result.cells[0];
    expect(plot1?.outputs).toEqual([{ kind: 'same' }]);

    // Plot 2 has modified base64 image
    const plot2 = result.cells[1];
    expect(plot2?.outputs?.[0]?.kind).toBe('image');

    // Table 1 has modified HTML
    const table1 = result.cells[2];
    expect(table1?.outputs?.[0]?.kind).toBe('html');
  });

  it('Pair 5: errors-and-streams diffs stream and error traceback without ANSI codes', () => {
    const rawA = readFixture('errors-and-streams-a.ipynb');
    const rawB = readFixture('errors-and-streams-b.ipynb');

    const result = diffNotebook(rawA, rawB, DEFAULT_NB_DIFF_OPTIONS);
    expect(result.cells).toHaveLength(2);

    const errorCell = result.cells[0];
    expect(errorCell?.outputs?.[0]?.kind).toBe('text');
    if (errorCell?.outputs?.[0]?.kind === 'text') {
      // ANSI escape sequences must be stripped in diff
      const hunkText = JSON.stringify(errorCell.outputs[0].diff);
      expect(hunkText).not.toContain('\u001b[0;31m');
    }
  });

  it('Pair 6: nonstandard parses string sources, attachments, and ignores duplicate IDs', () => {
    const rawA = readFixture('nonstandard-a.ipynb');
    const rawB = readFixture('nonstandard-b.ipynb');

    const result = diffNotebook(rawA, rawB, DEFAULT_NB_DIFF_OPTIONS);
    // Duplicate IDs were ignored and cells matched via LCS
    expect(result.stats.added).toBe(1);
    expect(result.stats.unchanged).toBe(3);
  });
});
