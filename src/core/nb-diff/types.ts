import type { DiffOptions, TextDiffResult } from '../text-diff/types';
import { DEFAULT_DIFF_OPTIONS } from '../text-diff/types';
import type { CellType, NbOutput } from '../nb-parse/types';

export interface NbDiffOptions extends DiffOptions {
  similarityThreshold: number; // default 0.5
  hideExecutionCount: boolean; // default true
  hideNoisyMetadata: boolean; // default true
  includeOutputs: boolean; // default true
}

export const DEFAULT_NB_DIFF_OPTIONS: NbDiffOptions = {
  ...DEFAULT_DIFF_OPTIONS,
  similarityThreshold: 0.5,
  hideExecutionCount: true,
  hideNoisyMetadata: true,
  includeOutputs: true
};

export type CellOp =
  | { op: 'unchanged'; a: number; b: number }
  | { op: 'modified'; a: number; b: number; similarity: number }
  | { op: 'moved'; a: number; b: number }
  | { op: 'added'; b: number }
  | { op: 'deleted'; a: number };

export type OutputDiff =
  | { kind: 'same' }
  | { kind: 'added'; output: NbOutput }
  | { kind: 'removed'; output: NbOutput }
  | { kind: 'text'; mime: string; diff: TextDiffResult } // stream, text/plain, error, html source
  | { kind: 'image'; mime: string; a: string; b: string } // base64 data
  | { kind: 'html'; a: string; b: string; sourceDiff: TextDiffResult };

export interface MetadataDiff {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { a: unknown; b: unknown }>;
  hiddenKeys: string[]; // noisy keys suppressed by options
}

export interface CellDiff {
  op: CellOp;
  typeChanged?: { from: CellType; to: CellType };
  source?: TextDiffResult;
  outputs?: OutputDiff[];
  metadata?: MetadataDiff;
}

export interface NotebookDiffResult {
  header: { field: string; a: unknown; b: unknown }[]; // kernel, language, nbformat
  cells: CellDiff[]; // in B order, deleted cells placed at their A position
  stats: {
    added: number;
    deleted: number;
    modified: number;
    moved: number;
    unchanged: number;
  };
}
