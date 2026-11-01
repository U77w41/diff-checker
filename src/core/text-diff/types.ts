export type Granularity = 'word' | 'char';

export interface DiffOptions {
  ignoreWhitespace: boolean; // collapse runs of spaces/tabs, trim line ends
  ignoreCase: boolean;
  ignoreLineEndings: boolean; // treat CRLF and LF as equal (default true)
  ignoreBlankLines: boolean;
  granularity: Granularity; // intra-line highlighting
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreLineEndings: true,
  ignoreBlankLines: false,
  granularity: 'word'
};

export interface InlineSpan {
  from: number;
  to: number;
  kind: 'add' | 'del';
}

// Character offsets in the ORIGINAL (not normalised) texts, in the shape
// @codemirror/merge's Change expects. Returned through diffConfig.override.
export interface CharChange {
  fromA: number;
  toA: number;
  fromB: number;
  toB: number;
}

export interface DiffLine {
  kind: 'context' | 'add' | 'del';
  oldNo?: number; // 1-based line number in A
  newNo?: number; // 1-based line number in B
  text: string; // original text, not normalised
  inline?: InlineSpan[];
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface TextDiffResult {
  identical: boolean;
  changes: CharChange[]; // for the CodeMirror view; sorted, non-overlapping
  hunks: Hunk[];
  stats: { added: number; removed: number };
}
