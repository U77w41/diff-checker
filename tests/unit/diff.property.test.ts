import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { diffText, applyChanges } from '../../src/core/text-diff/diff';
import type { DiffOptions } from '../../src/core/text-diff/types';

const allOptionsOff: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreLineEndings: false,
  ignoreBlankLines: false,
  granularity: 'word'
};

describe('Text Diff Property Tests (fast-check)', () => {
  it('diffing any text against itself always returns identical: true and no changes', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = diffText(text, text, allOptionsOff);
        expect(result.identical).toBe(true);
        expect(result.changes).toHaveLength(0);
        expect(result.hunks).toHaveLength(0);
        expect(result.stats).toEqual({ added: 0, removed: 0 });
      }),
      { numRuns: 200 }
    );
  });

  it('applying CharChanges to text A reproduces text B exactly (word mode)', () => {
    const lineGen = fc.string({ maxLength: 100 });
    const textGen = fc.array(lineGen, { maxLength: 25 }).map((lines) => lines.join('\n'));

    fc.assert(
      fc.property(textGen, textGen, (textA, textB) => {
        const result = diffText(textA, textB, allOptionsOff);
        const reconstructed = applyChanges(textA, textB, result.changes);
        expect(reconstructed).toBe(textB);
      }),
      { numRuns: 200 }
    );
  });

  it('applying CharChanges to text A reproduces text B exactly (character mode)', () => {
    const charOpts: DiffOptions = {
      ...allOptionsOff,
      granularity: 'char'
    };

    const lineGen = fc.string({ maxLength: 60 });
    const textGen = fc.array(lineGen, { maxLength: 15 }).map((lines) => lines.join('\n'));

    fc.assert(
      fc.property(textGen, textGen, (textA, textB) => {
        const result = diffText(textA, textB, charOpts);
        const reconstructed = applyChanges(textA, textB, result.changes);
        expect(reconstructed).toBe(textB);
      }),
      { numRuns: 100 }
    );
  });
});
