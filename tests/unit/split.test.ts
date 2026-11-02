import { describe, it, expect } from 'vitest';
import { pairHunkRows } from '../../src/core/text-diff/split';
import type { DiffLine, Hunk } from '../../src/core/text-diff/types';

const ctx = (oldNo: number, newNo: number, text: string): DiffLine => ({
  kind: 'context',
  oldNo,
  newNo,
  text
});
const del = (oldNo: number, text: string): DiffLine => ({ kind: 'del', oldNo, text });
const add = (newNo: number, text: string): DiffLine => ({ kind: 'add', newNo, text });
const hunk = (lines: DiffLine[]): Hunk => ({
  oldStart: 1,
  oldLines: 0,
  newStart: 1,
  newLines: 0,
  lines
});
const texts = (rows: ReturnType<typeof pairHunkRows>) =>
  rows.map((r) => [r.kind, r.left?.text, r.right?.text]);

describe('pairHunkRows', () => {
  it('puts context lines on both sides', () => {
    const rows = pairHunkRows(hunk([ctx(1, 1, 'a'), ctx(2, 2, 'b')]));
    expect(texts(rows)).toEqual([
      ['context', 'a', 'a'],
      ['context', 'b', 'b']
    ]);
    expect(rows[0]?.left?.oldNo).toBe(1);
    expect(rows[0]?.right?.newNo).toBe(1);
  });

  it('pairs equal del/add runs one to one', () => {
    const rows = pairHunkRows(hunk([del(1, 'a'), del(2, 'b'), add(1, 'A'), add(2, 'B')]));
    expect(texts(rows)).toEqual([
      ['change', 'a', 'A'],
      ['change', 'b', 'B']
    ]);
  });

  it('leaves the right side empty when there are more deletions', () => {
    const rows = pairHunkRows(hunk([del(1, 'a'), del(2, 'b'), add(1, 'A')]));
    expect(texts(rows)).toEqual([
      ['change', 'a', 'A'],
      ['change', 'b', undefined]
    ]);
  });

  it('leaves the left side empty when there are more additions', () => {
    const rows = pairHunkRows(hunk([del(1, 'a'), add(1, 'A'), add(2, 'B')]));
    expect(texts(rows)).toEqual([
      ['change', 'a', 'A'],
      ['change', undefined, 'B']
    ]);
  });

  it('keeps runs separated by context apart', () => {
    const rows = pairHunkRows(hunk([del(1, 'a'), add(1, 'b'), ctx(2, 2, 'c'), add(3, 'd')]));
    expect(texts(rows)).toEqual([
      ['change', 'a', 'b'],
      ['context', 'c', 'c'],
      ['change', undefined, 'd']
    ]);
  });

  it('keeps the original line numbers', () => {
    const rows = pairHunkRows(hunk([del(7, 'a'), add(9, 'A')]));
    expect(rows[0]?.left?.oldNo).toBe(7);
    expect(rows[0]?.right?.newNo).toBe(9);
  });
});
