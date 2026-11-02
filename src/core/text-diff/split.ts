import type { DiffLine, Hunk } from './types';

/** One visual row of a side-by-side diff: old line on the left, new line on the right. */
export interface SplitRow {
  kind: 'context' | 'change';
  left?: DiffLine;
  right?: DiffLine;
}

/**
 * Lays a unified hunk out as side-by-side rows. Context lines fill both sides; within each
 * run of changes the i-th deletion is paired with the i-th addition, and leftovers get an
 * empty opposite cell.
 */
export function pairHunkRows(hunk: Hunk): SplitRow[] {
  const rows: SplitRow[] = [];
  let dels: DiffLine[] = [];
  let adds: DiffLine[] = [];

  const flush = () => {
    const count = Math.max(dels.length, adds.length);
    for (let i = 0; i < count; i++) {
      rows.push({ kind: 'change', left: dels[i], right: adds[i] });
    }
    dels = [];
    adds = [];
  };

  for (const line of hunk.lines) {
    if (line.kind === 'del') dels.push(line);
    else if (line.kind === 'add') adds.push(line);
    else {
      flush();
      rows.push({ kind: 'context', left: line, right: line });
    }
  }
  flush();
  return rows;
}
