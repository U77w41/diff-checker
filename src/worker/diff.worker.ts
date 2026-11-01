import * as Comlink from 'comlink';
import { diffText } from '../core/text-diff/diff';
import type { DiffOptions, TextDiffResult } from '../core/text-diff/types';
import { parseNotebook } from '../core/nb-parse/parse';
import type { Notebook } from '../core/nb-parse/types';
import { diffNotebook } from '../core/nb-diff/diff';
import type { NbDiffOptions, NotebookDiffResult } from '../core/nb-diff/types';

// Cache parsed notebooks keyed by input text so changing options doesn't re-parse
const parseCache = new Map<string, Notebook>();
const MAX_CACHE_SIZE = 10;

function getParsedNotebook(raw: string): Notebook {
  let cached = parseCache.get(raw);
  if (!cached) {
    cached = parseNotebook(raw);
    if (parseCache.size >= MAX_CACHE_SIZE) {
      const firstKey = parseCache.keys().next().value;
      if (firstKey) parseCache.delete(firstKey);
    }
    parseCache.set(raw, cached);
  }
  return cached;
}

const api = {
  diffText(a: string, b: string, opts: DiffOptions): TextDiffResult {
    return diffText(a, b, opts);
  },
  diffNotebook(rawA: string, rawB: string, opts: NbDiffOptions): NotebookDiffResult {
    const nbA = getParsedNotebook(rawA);
    const nbB = getParsedNotebook(rawB);
    return diffNotebook(nbA, nbB, opts);
  }
};

export type DiffWorkerApi = typeof api;

Comlink.expose(api);
