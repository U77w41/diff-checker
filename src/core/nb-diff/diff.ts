import { parseNotebook } from '../nb-parse/parse';
import type { Notebook } from '../nb-parse/types';
import { alignNotebooks } from '../nb-align/align';
import { diffText } from '../text-diff/diff';
import { diffOutputs } from './output-diff';
import { diffMetadata, diffNotebookHeader } from './metadata-diff';
import type { CellDiff, NbDiffOptions, NotebookDiffResult } from './types';

/**
 * Computes the complete notebook difference between notebook A and notebook B.
 * Accepts either raw JSON strings or pre-parsed Notebook objects.
 */
export function diffNotebook(
  rawA: string | Notebook,
  rawB: string | Notebook,
  opts: NbDiffOptions
): NotebookDiffResult {
  const nbA = typeof rawA === 'string' ? parseNotebook(rawA) : rawA;
  const nbB = typeof rawB === 'string' ? parseNotebook(rawB) : rawB;

  const header = diffNotebookHeader(nbA, nbB);
  const aligned = alignNotebooks(nbA, nbB, opts);

  const cells: CellDiff[] = [];
  let added = 0;
  let deleted = 0;
  let modified = 0;
  let moved = 0;
  let unchanged = 0;

  for (const item of aligned) {
    const { op, typeChanged } = item;

    if (op.op === 'unchanged') {
      unchanged++;
      const cellA = nbA.cells[op.a]!;
      const cellB = nbB.cells[op.b]!;

      const outputs = opts.includeOutputs
        ? diffOutputs(cellA.outputs, cellB.outputs, opts)
        : undefined;

      const metadata = diffMetadata(cellA.metadata, cellB.metadata, opts.hideNoisyMetadata);

      cells.push({
        op,
        outputs,
        metadata
      });
    } else if (op.op === 'modified') {
      modified++;
      const cellA = nbA.cells[op.a]!;
      const cellB = nbB.cells[op.b]!;

      const source = diffText(cellA.source, cellB.source, opts);

      const outputs = opts.includeOutputs
        ? diffOutputs(cellA.outputs, cellB.outputs, opts)
        : undefined;

      const metadata = diffMetadata(cellA.metadata, cellB.metadata, opts.hideNoisyMetadata);

      cells.push({
        op,
        typeChanged,
        source,
        outputs,
        metadata
      });
    } else if (op.op === 'moved') {
      moved++;
      const cellA = nbA.cells[op.a]!;
      const cellB = nbB.cells[op.b]!;

      const outputs = opts.includeOutputs
        ? diffOutputs(cellA.outputs, cellB.outputs, opts)
        : undefined;

      const metadata = diffMetadata(cellA.metadata, cellB.metadata, opts.hideNoisyMetadata);

      cells.push({
        op,
        outputs,
        metadata
      });
    } else if (op.op === 'added') {
      added++;
      cells.push({ op });
    } else if (op.op === 'deleted') {
      deleted++;
      cells.push({ op });
    }
  }

  return {
    header,
    cells,
    stats: {
      added,
      deleted,
      modified,
      moved,
      unchanged
    }
  };
}
