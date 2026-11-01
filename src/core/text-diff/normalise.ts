import type { DiffOptions } from './types';

export interface NormalisedLine {
  text: string; // normalised text for comparison
  original: string; // original line content (without trailing newline)
  originalWithBreak: string; // original line including trailing newline
  originalIndex: number; // 0-based index in the lines array
  originalLineNo: number; // 1-based line number in original text
  start: number; // character start offset in original text
  end: number; // character end offset (before newline)
  endWithBreak: number; // character end offset (after newline)
}

export interface NormalisedText {
  originalText: string;
  lines: NormalisedLine[];
  allOriginalLines: string[];
  blankLineIndices: Set<number>;
}

export function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

export function splitLinesWithBreak(text: string): string[] {
  return text.match(/[^\n\r]+(\r\n|[\n\r])?|(\r\n|[\n\r])/g) || [];
}

export function normaliseLine(line: string, opts: DiffOptions): string {
  let result = line;
  if (opts.ignoreWhitespace) {
    result = result.replace(/[ \t]+/g, ' ').trim();
  }
  if (opts.ignoreCase) {
    result = result.toLowerCase();
  }
  return result;
}

export function normaliseText(rawText: string, opts: DiffOptions): NormalisedText {
  const originalText = stripBOM(rawText);
  const pieces = splitLinesWithBreak(originalText);
  const lines: NormalisedLine[] = [];
  const allOriginalLines: string[] = [];
  const blankLineIndices = new Set<number>();

  let offset = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    const original = piece.replace(/\r\n|[\n\r]$/, '');
    allOriginalLines.push(original);

    const start = offset;
    const end = offset + original.length;
    const endWithBreak = offset + piece.length;
    offset = endWithBreak;

    const isBlank = original.trim().length === 0;
    if (isBlank) {
      blankLineIndices.add(i);
    }

    if (opts.ignoreBlankLines && isBlank) {
      continue;
    }

    const normalised = normaliseLine(original, opts);
    lines.push({
      text: normalised,
      original,
      originalWithBreak: piece,
      originalIndex: i,
      originalLineNo: i + 1,
      start,
      end,
      endWithBreak
    });
  }

  return {
    originalText,
    lines,
    allOriginalLines,
    blankLineIndices
  };
}
