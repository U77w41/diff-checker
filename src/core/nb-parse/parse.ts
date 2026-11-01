import { DiffError } from '../errors';
import type { CellType, NbCell, NbOutput, Notebook } from './types';

/**
 * Parses raw JSON string into a validated Notebook model (nbformat 4.x).
 * Fills missing fields with spec defaults and strips duplicate cell IDs.
 */
export function parseNotebook(rawJson: string): Notebook {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const match = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    const line = match ? parseInt(match[1]!, 10) : undefined;
    const col = match ? parseInt(match[2]!, 10) : undefined;
    throw new DiffError('INVALID_JSON', `Invalid JSON: ${message}`, line, col);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DiffError('INVALID_JSON', 'Notebook JSON must be an object');
  }

  const rawObj = parsed as Record<string, unknown>;

  const nbformat = typeof rawObj.nbformat === 'number' ? rawObj.nbformat : 0;
  if (nbformat < 4) {
    throw new DiffError('UNSUPPORTED_NBFORMAT', 'Only nbformat 4 notebooks are supported');
  }

  const nbformatMinor = typeof rawObj.nbformat_minor === 'number' ? rawObj.nbformat_minor : 0;
  const metadata =
    rawObj.metadata && typeof rawObj.metadata === 'object' && !Array.isArray(rawObj.metadata)
      ? { ...(rawObj.metadata as Record<string, unknown>) }
      : {};

  const rawCells = Array.isArray(rawObj.cells) ? (rawObj.cells as Record<string, unknown>[]) : [];

  // Count ID occurrences to detect duplicates
  const idCounts = new Map<string, number>();
  for (const cell of rawCells) {
    if (cell && typeof cell.id === 'string' && cell.id.trim().length > 0) {
      const id = cell.id.trim();
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
  }

  const cells: NbCell[] = [];
  for (const rawCell of rawCells) {
    if (!rawCell || typeof rawCell !== 'object') continue;

    // Cell ID: keep only if strictly unique in this notebook
    let id: string | undefined = undefined;
    if (typeof rawCell.id === 'string' && rawCell.id.trim().length > 0) {
      const trimmedId = rawCell.id.trim();
      if (idCounts.get(trimmedId) === 1) {
        id = trimmedId;
      }
    }

    const cellType: CellType =
      rawCell.cell_type === 'markdown' || rawCell.cell_type === 'raw' ? rawCell.cell_type : 'code';

    // Source can be string or string[]
    let source = '';
    if (Array.isArray(rawCell.source)) {
      source = rawCell.source.map((s: unknown) => (typeof s === 'string' ? s : '')).join('');
    } else if (typeof rawCell.source === 'string') {
      source = rawCell.source;
    }

    const executionCount =
      typeof rawCell.execution_count === 'number' ? rawCell.execution_count : null;

    const cellMetadata =
      rawCell.metadata && typeof rawCell.metadata === 'object' && !Array.isArray(rawCell.metadata)
        ? { ...rawCell.metadata }
        : {};

    const outputs: NbOutput[] = [];
    if (cellType === 'code' && Array.isArray(rawCell.outputs)) {
      for (const rawOut of rawCell.outputs) {
        if (!rawOut || typeof rawOut !== 'object') continue;

        if (rawOut.output_type === 'stream') {
          const name: 'stdout' | 'stderr' = rawOut.name === 'stderr' ? 'stderr' : 'stdout';
          let text = '';
          if (Array.isArray(rawOut.text)) {
            text = rawOut.text.map((s: unknown) => (typeof s === 'string' ? s : '')).join('');
          } else if (typeof rawOut.text === 'string') {
            text = rawOut.text;
          }
          outputs.push({ kind: 'stream', name, text });
        } else if (
          rawOut.output_type === 'execute_result' ||
          rawOut.output_type === 'display_data'
        ) {
          const outputType: 'execute_result' | 'display_data' =
            rawOut.output_type === 'display_data' ? 'display_data' : 'execute_result';

          const data: Record<string, string> = {};
          if (rawOut.data && typeof rawOut.data === 'object') {
            for (const [mime, val] of Object.entries(rawOut.data)) {
              if (Array.isArray(val)) {
                data[mime] = val.map((s: unknown) => (typeof s === 'string' ? s : '')).join('');
              } else if (typeof val === 'string') {
                data[mime] = val;
              } else if (val !== null && val !== undefined) {
                data[mime] = JSON.stringify(val);
              }
            }
          }

          const outMeta =
            rawOut.metadata &&
            typeof rawOut.metadata === 'object' &&
            !Array.isArray(rawOut.metadata)
              ? { ...rawOut.metadata }
              : {};

          outputs.push({
            kind: 'rich',
            outputType,
            data,
            metadata: outMeta
          });
        } else if (rawOut.output_type === 'error') {
          const ename = typeof rawOut.ename === 'string' ? rawOut.ename : 'Error';
          const evalue = typeof rawOut.evalue === 'string' ? rawOut.evalue : '';
          const traceback: string[] = Array.isArray(rawOut.traceback)
            ? rawOut.traceback.map((s: unknown) => (typeof s === 'string' ? s : ''))
            : [];
          outputs.push({ kind: 'error', ename, evalue, traceback });
        }
      }
    }

    let attachments: Record<string, Record<string, string>> | undefined = undefined;
    if (rawCell.attachments && typeof rawCell.attachments === 'object') {
      attachments = {};
      for (const [filename, mimeMap] of Object.entries(rawCell.attachments)) {
        if (mimeMap && typeof mimeMap === 'object') {
          const sanitizedMimeMap: Record<string, string> = {};
          for (const [m, b64] of Object.entries(mimeMap)) {
            if (typeof b64 === 'string') {
              sanitizedMimeMap[m] = b64;
            }
          }
          attachments[filename] = sanitizedMimeMap;
        }
      }
    }

    cells.push({
      id,
      type: cellType,
      source,
      outputs,
      executionCount,
      metadata: cellMetadata,
      attachments
    });
  }

  return {
    nbformat,
    nbformatMinor,
    metadata,
    cells
  };
}
