import * as Comlink from 'comlink';
import { diffText } from '../core/text-diff/diff';
import type { DiffOptions, TextDiffResult } from '../core/text-diff/types';

const api = {
  diffText(a: string, b: string, opts: DiffOptions): TextDiffResult {
    return diffText(a, b, opts);
  },
  diffNotebook(): never {
    throw new Error('Notebook diffing is implemented in Phase 3');
  }
};

export type DiffWorkerApi = typeof api;

Comlink.expose(api);
