import { describe, it, expect } from 'vitest';
import { tokenSimilarity, tokenizeSource } from '../../src/core/nb-align/similarity';

describe('tokenSimilarity (Dice coefficient on cell tokens)', () => {
  it('splits source into words and punctuation tokens', () => {
    const tokens = tokenizeSource('df.plot(kind="bar")');
    expect(tokens).toEqual(['df', '.', 'plot', '(', 'kind', '=', '"', 'bar', '"', ')']);
  });

  it('matches all 4 reference table values from the plan spec', () => {
    // Reference 1: df.plot() vs df.plot(kind="bar") => 0.67
    expect(tokenSimilarity('df.plot()', 'df.plot(kind="bar")')).toBeCloseTo(0.67, 2);

    // Reference 2: import pandas as pd vs import numpy as np => 0.50
    expect(tokenSimilarity('import pandas as pd', 'import numpy as np')).toBeCloseTo(0.5, 2);

    // Reference 3: x = 1 vs y = 2 => 0.33
    expect(tokenSimilarity('x = 1', 'y = 2')).toBeCloseTo(0.33, 2);

    // Reference 4: # Title vs # A completely different heading about plots => 0.22
    expect(tokenSimilarity('# Title', '# A completely different heading about plots')).toBeCloseTo(
      0.22,
      2
    );
  });

  it('scores two empty cells as 1.0', () => {
    expect(tokenSimilarity('', '')).toBe(1.0);
    expect(tokenSimilarity('   \n  \t', '')).toBe(1.0);
  });

  it('scores completely disjoint token lists as 0.0', () => {
    expect(tokenSimilarity('aaa bbb', 'ccc ddd')).toBe(0.0);
  });

  it('handles identical tokens with 1.0', () => {
    expect(tokenSimilarity('x = 10\nprint(x)', 'x = 10\nprint(x)')).toBe(1.0);
  });

  it('handles multiset duplicate tokens correctly', () => {
    // "a a" has two 'a's, "a" has one 'a'. Intersection is 1. (2 * 1) / (2 + 1) = 2/3 = 0.666...
    expect(tokenSimilarity('a a', 'a')).toBeCloseTo(2 / 3, 4);
  });
});
