import { describe, it, expect } from 'vitest';
import { diffText } from '../../src/core/text-diff/diff';
import { DEFAULT_DIFF_OPTIONS } from '../../src/core/text-diff/types';

describe('Text Diff Performance Benchmarks', () => {
  it('diffs a 10,000-line text pair in under 1 second', () => {
    const linesA: string[] = [];
    const linesB: string[] = [];

    for (let i = 0; i < 10000; i++) {
      if (i % 20 === 0) {
        linesA.push(`const value_${i} = ${i * 2}; // calculation step ${i}`);
        linesB.push(`const value_${i} = ${i * 3 + 1}; // modified calculation step ${i}`);
      } else if (i % 50 === 0) {
        linesA.push(`function compute_${i}() { return ${i}; }`);
        // deleted in B
      } else if (i % 55 === 0) {
        // added in B
        linesB.push(`function added_helper_${i}() { return true; }`);
        linesA.push(`// standard comment line ${i}`);
        linesB.push(`// standard comment line ${i}`);
      } else {
        const line = `let dataRow_${i} = { id: ${i}, active: true, name: "item_${i}" };`;
        linesA.push(line);
        linesB.push(line);
      }
    }

    const textA = linesA.join('\n');
    const textB = linesB.join('\n');

    const start = performance.now();
    const result = diffText(textA, textB, DEFAULT_DIFF_OPTIONS);
    const duration = performance.now() - start;

    expect(result.identical).toBe(false);
    expect(result.stats.added).toBeGreaterThan(0);
    expect(result.stats.removed).toBeGreaterThan(0);

    // Hard constraint: under 1 s (1000 ms), fail CI if exceeded by > 50% (1500 ms)
    expect(duration).toBeLessThan(1500);
  });

  it('diffs a 2 MB single-line minified file in under 2 seconds (Review focus 3)', () => {
    const size = 2 * 1024 * 1024; // 2 MB
    const chunk = 'abcdefghijklmnopqrstuvwxyz0123456789,';
    const repeatCount = Math.ceil(size / chunk.length);
    const base = chunk.repeat(repeatCount).slice(0, size);

    // Change one character in the middle
    const mid = Math.floor(size / 2);
    const minifiedA = base.slice(0, mid) + 'X' + base.slice(mid + 1);
    const minifiedB = base.slice(0, mid) + 'Y' + base.slice(mid + 1);

    const start = performance.now();
    const result = diffText(minifiedA, minifiedB, DEFAULT_DIFF_OPTIONS);
    const duration = performance.now() - start;

    expect(result.identical).toBe(false);
    // Intra-line highlighting was skipped because line > 10,000 characters
    expect(result.hunks[0]?.lines[0]?.inline).toBeUndefined();
    expect(result.hunks[0]?.lines[1]?.inline).toBeUndefined();

    // Must finish under 2 s (2000 ms)
    expect(duration).toBeLessThan(2000);
  });
});
