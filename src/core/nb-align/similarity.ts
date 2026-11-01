const TOKEN_REGEX = /[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

/**
 * Splits a source string into tokens: words, plus each punctuation character on its own.
 * Whitespace is ignored.
 */
export function tokenizeSource(source: string): string[] {
  return source.match(TOKEN_REGEX) || [];
}

/**
 * Computes the token-level Dice similarity coefficient between two source strings.
 * Formula: 2 × |intersection of multiset tokens| / (|tokens A| + |tokens B|)
 * Two empty cells score 1.0.
 */
export function tokenSimilarity(sourceA: string, sourceB: string): number {
  const tokensA = tokenizeSource(sourceA);
  const tokensB = tokenizeSource(sourceB);

  if (tokensA.length === 0 && tokensB.length === 0) {
    return 1.0;
  }
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0.0;
  }

  const countsA = new Map<string, number>();
  for (const t of tokensA) {
    countsA.set(t, (countsA.get(t) ?? 0) + 1);
  }

  const countsB = new Map<string, number>();
  for (const t of tokensB) {
    countsB.set(t, (countsB.get(t) ?? 0) + 1);
  }

  let intersectionSize = 0;
  for (const [token, countA] of countsA) {
    const countB = countsB.get(token);
    if (countB !== undefined) {
      intersectionSize += Math.min(countA, countB);
    }
  }

  return (2 * intersectionSize) / (tokensA.length + tokensB.length);
}
