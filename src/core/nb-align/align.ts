import { fnv1a32 } from '../hash';
import { normaliseText } from '../text-diff/normalise';
import type { DiffOptions } from '../text-diff/types';
import type { CellType, NbCell, Notebook } from '../nb-parse/types';
import type { CellOp, NbDiffOptions } from '../nb-diff/types';
import { tokenSimilarity } from './similarity';

export interface AlignedCellPair {
  op: CellOp;
  typeChanged?: { from: CellType; to: CellType };
}

/**
 * Computes the 32-bit FNV-1a match key for a cell:
 * hash(cell.type + ':' + normalisedSource)
 */
export function computeCellMatchKey(cell: NbCell, opts: DiffOptions): number {
  const norm = normaliseText(cell.source, opts);
  const normContent = norm.lines.map((l) => l.text).join('\n');
  return fnv1a32(`${cell.type}:${normContent}`);
}

/**
 * Finds the Longest Common Subsequence of match keys between two slices.
 * Returns array of [indexInA, indexInB] pairs, strictly monotonic.
 */
function lcsIndices(keysA: number[], keysB: number[]): [number, number][] {
  const m = keysA.length;
  const n = keysB.length;
  if (m === 0 || n === 0) return [];

  // DP table for LCS lengths
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    const kA = keysA[i - 1]!;
    for (let j = 1; j <= n; j++) {
      if (kA === keysB[j - 1]!) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to extract indices
  const result: [number, number][] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (keysA[i - 1]! === keysB[j - 1]!) {
      result.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  result.reverse();
  return result;
}

/**
 * Computes Longest Increasing Subsequence on B coordinates to ensure non-crossing anchors.
 */
function longestIncreasingSubsequence(pairs: [number, number][]): [number, number][] {
  if (pairs.length === 0) return [];

  const n = pairs.length;
  const tails: number[] = [];
  const tailIndices: number[] = [];
  const prev: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const x = pairs[i]![1];

    // Binary search for x in tails
    let left = 0;
    let right = tails.length;
    while (left < right) {
      const mid = (left + right) >> 1;
      if (tails[mid]! < x) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    tails[left] = x;
    tailIndices[left] = i;
    if (left > 0) {
      prev[i] = tailIndices[left - 1]!;
    }
  }

  const result: [number, number][] = [];
  let curr: number | undefined = tailIndices[tails.length - 1];
  while (curr !== undefined && curr >= 0) {
    result.push(pairs[curr]!);
    curr = prev[curr];
  }
  result.reverse();
  return result;
}

/**
 * 4-pass cell matching between notebook A and notebook B.
 */
export function alignNotebooks(
  nbA: Notebook,
  nbB: Notebook,
  opts: NbDiffOptions
): AlignedCellPair[] {
  const cellsA = nbA.cells;
  const cellsB = nbB.cells;
  const numA = cellsA.length;
  const numB = cellsB.length;

  const keysA = cellsA.map((c) => computeCellMatchKey(c, opts));
  const keysB = cellsB.map((c) => computeCellMatchKey(c, opts));

  // Mapping from A index to paired result
  const matchedA = new Map<number, AlignedCellPair>();
  const matchedB = new Map<number, AlignedCellPair>();

  // Helper to mark a pair
  const recordPair = (
    a: number,
    b: number,
    opKind: 'unchanged' | 'modified',
    sim?: number,
    typeChanged?: { from: CellType; to: CellType }
  ) => {
    let op: CellOp;
    if (opKind === 'unchanged') {
      op = { op: 'unchanged', a, b };
    } else {
      op = { op: 'modified', a, b, similarity: sim ?? 0 };
    }
    const pair: AlignedCellPair = { op, typeChanged };
    matchedA.set(a, pair);
    matchedB.set(b, pair);
  };

  // PASS 1: Cell IDs (Fixed Anchors)
  const idMapB = new Map<string, number>();
  for (let b = 0; b < numB; b++) {
    const id = cellsB[b]?.id;
    if (id) idMapB.set(id, b);
  }

  const candidateIdPairs: [number, number][] = [];
  for (let a = 0; a < numA; a++) {
    const id = cellsA[a]?.id;
    if (id && idMapB.has(id)) {
      candidateIdPairs.push([a, idMapB.get(id)!]);
    }
  }

  // Ensure non-crossing anchors via LIS
  candidateIdPairs.sort((p1, p2) => p1[0] - p2[0]);
  const anchorPairs = longestIncreasingSubsequence(candidateIdPairs);

  for (const [a, b] of anchorPairs) {
    const cA = cellsA[a]!;
    const cB = cellsB[b]!;
    const typeChanged = cA.type !== cB.type ? { from: cA.type, to: cB.type } : undefined;

    if (keysA[a] === keysB[b] && !typeChanged) {
      recordPair(a, b, 'unchanged');
    } else {
      const sim = tokenSimilarity(cA.source, cB.source);
      recordPair(a, b, 'modified', sim, typeChanged);
    }
  }

  // PASS 2: Exact matches between consecutive anchors
  // Build boundary intervals including virtual ends (-1, -1) and (numA, numB)
  const fullAnchors: [number, number][] = [[-1, -1], ...anchorPairs, [numA, numB]];

  const pass2Matches: [number, number][] = [];
  for (let k = 0; k < fullAnchors.length - 1; k++) {
    const [startA, startB] = fullAnchors[k]!;
    const [endA, endB] = fullAnchors[k + 1]!;

    const gapAIndices: number[] = [];
    const gapAKeys: number[] = [];
    for (let a = startA + 1; a < endA; a++) {
      if (!matchedA.has(a)) {
        gapAIndices.push(a);
        gapAKeys.push(keysA[a]!);
      }
    }

    const gapBIndices: number[] = [];
    const gapBKeys: number[] = [];
    for (let b = startB + 1; b < endB; b++) {
      if (!matchedB.has(b)) {
        gapBIndices.push(b);
        gapBKeys.push(keysB[b]!);
      }
    }

    if (gapAIndices.length > 0 && gapBIndices.length > 0) {
      const lcs = lcsIndices(gapAKeys, gapBKeys);
      for (const [idxA, idxB] of lcs) {
        const a = gapAIndices[idxA]!;
        const b = gapBIndices[idxB]!;
        recordPair(a, b, 'unchanged');
        pass2Matches.push([a, b]);
      }
    }
  }

  // Combine Pass 1 anchors and Pass 2 exact matches for Pass 3 gaps
  const allOrderedAnchors = [...anchorPairs, ...pass2Matches].sort((p1, p2) => p1[0] - p2[0]);
  const gapsWithBounds: [number, number][] = [[-1, -1], ...allOrderedAnchors, [numA, numB]];

  // PASS 3: Modified cells in remaining gaps
  for (let k = 0; k < gapsWithBounds.length - 1; k++) {
    const [startA, startB] = gapsWithBounds[k]!;
    const [endA, endB] = gapsWithBounds[k + 1]!;

    const gapA: number[] = [];
    for (let a = startA + 1; a < endA; a++) {
      if (!matchedA.has(a)) gapA.push(a);
    }

    const gapB: number[] = [];
    for (let b = startB + 1; b < endB; b++) {
      if (!matchedB.has(b)) gapB.push(b);
    }

    if (gapA.length === 0 || gapB.length === 0) continue;

    // Rule 3a: Exactly one cell on each side
    if (gapA.length === 1 && gapB.length === 1) {
      const a = gapA[0]!;
      const b = gapB[0]!;
      const cA = cellsA[a]!;
      const cB = cellsB[b]!;
      const sim = tokenSimilarity(cA.source, cB.source);
      const typeChanged = cA.type !== cB.type ? { from: cA.type, to: cB.type } : undefined;
      recordPair(a, b, 'modified', sim, typeChanged);
      continue;
    }

    // Rule 3b: Score same-type A x B pairs
    interface Candidate {
      a: number;
      b: number;
      score: number;
    }
    const candidates: Candidate[] = [];
    const limitDistance = gapA.length * gapB.length > 10000;

    for (let posA = 0; posA < gapA.length; posA++) {
      const a = gapA[posA]!;
      const cA = cellsA[a]!;
      for (let posB = 0; posB < gapB.length; posB++) {
        if (limitDistance && Math.abs(posA - posB) > 25) continue;

        const b = gapB[posB]!;
        const cB = cellsB[b]!;
        if (cA.type !== cB.type) continue; // same-type only

        const score = tokenSimilarity(cA.source, cB.source);
        if (score >= opts.similarityThreshold) {
          candidates.push({ a, b, score });
        }
      }
    }

    // Sort: highest score first; ties: lowest a, then lowest b
    candidates.sort((c1, c2) => {
      if (Math.abs(c2.score - c1.score) > 1e-6) {
        return c2.score - c1.score;
      }
      if (c1.a !== c2.a) return c1.a - c2.a;
      return c1.b - c2.b;
    });

    // Greedily take non-crossing pairs
    const takenInGap: [number, number][] = [];
    const usedA = new Set<number>();
    const usedB = new Set<number>();

    for (const cand of candidates) {
      if (usedA.has(cand.a) || usedB.has(cand.b)) continue;

      // Check crossing with already taken pairs
      let crosses = false;
      for (const [ta, tb] of takenInGap) {
        if ((cand.a < ta && cand.b > tb) || (cand.a > ta && cand.b < tb)) {
          crosses = true;
          break;
        }
      }

      if (!crosses) {
        takenInGap.push([cand.a, cand.b]);
        usedA.add(cand.a);
        usedB.add(cand.b);
        recordPair(cand.a, cand.b, 'modified', cand.score);
      }
    }
  }

  // PASS 4: Moves and leftovers
  // Scanning A in order: an unpaired A cell whose match key equals an unpaired B cell's key is moved
  for (let a = 0; a < numA; a++) {
    if (matchedA.has(a)) continue;

    const key = keysA[a]!;
    for (let b = 0; b < numB; b++) {
      if (matchedB.has(b)) continue;
      if (keysB[b] === key) {
        const op: CellOp = { op: 'moved', a, b };
        const pair: AlignedCellPair = { op };
        matchedA.set(a, pair);
        matchedB.set(b, pair);
        break; // Take the first such B cell
      }
    }
  }

  // Build Output Ordering:
  // "emit B's cells in B order, each with its op (unchanged, modified, moved or added).
  // Emit each deleted A cell immediately after the op of the nearest earlier A cell that has a B partner,
  // keeping A order among deleted cells; deleted cells with no such earlier cell come first."

  const deletedAfterA = new Map<number, AlignedCellPair[]>();
  const initialDeleted: AlignedCellPair[] = [];

  for (let a = 0; a < numA; a++) {
    if (!matchedA.has(a)) {
      const delPair: AlignedCellPair = { op: { op: 'deleted', a } };
      // Find nearest earlier A cell with a B partner
      let partnerA: number | null = null;
      for (let prev = a - 1; prev >= 0; prev--) {
        if (matchedA.has(prev)) {
          partnerA = prev;
          break;
        }
      }

      if (partnerA !== null) {
        if (!deletedAfterA.has(partnerA)) {
          deletedAfterA.set(partnerA, []);
        }
        deletedAfterA.get(partnerA)!.push(delPair);
      } else {
        initialDeleted.push(delPair);
      }
    }
  }

  const result: AlignedCellPair[] = [...initialDeleted];

  for (let b = 0; b < numB; b++) {
    let pair = matchedB.get(b);
    if (!pair) {
      pair = { op: { op: 'added', b } };
    }
    result.push(pair);

    // If this B cell has an A partner, check if any deleted cells attach to it
    if ('a' in pair.op) {
      const partnerA = pair.op.a;
      const dels = deletedAfterA.get(partnerA);
      if (dels) {
        result.push(...dels);
      }
    }
  }

  return result;
}
