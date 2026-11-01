import { diffArrays, diffWordsWithSpace, diffChars } from 'diff';
import { normaliseText, stripBOM } from './normalise';
import type { NormalisedLine } from './normalise';
import type { CharChange, DiffLine, DiffOptions, Hunk, InlineSpan, TextDiffResult } from './types';

type EditOp =
  | { kind: 'context'; lineA: NormalisedLine; lineB: NormalisedLine }
  | { kind: 'del'; lineA: NormalisedLine }
  | { kind: 'add'; lineB: NormalisedLine };

export function diffText(rawA: string, rawB: string, opts: DiffOptions): TextDiffResult {
  const normA = normaliseText(rawA, opts);
  const normB = normaliseText(rawB, opts);

  const cleanA = stripBOM(rawA);
  const cleanB = stripBOM(rawB);

  const editOps: EditOp[] = [];
  let addedCount = 0;
  let removedCount = 0;

  if (normA.lines.length === 0 && normB.lines.length === 0) {
    return {
      identical: true,
      changes: [],
      hunks: [],
      stats: { added: 0, removed: 0 }
    };
  } else if (normA.lines.length === 0) {
    for (const lineB of normB.lines) {
      editOps.push({ kind: 'add', lineB });
      addedCount++;
    }
  } else if (normB.lines.length === 0) {
    for (const lineA of normA.lines) {
      editOps.push({ kind: 'del', lineA });
      removedCount++;
    }
  } else {
    const rawChanges = diffArrays(normA.lines, normB.lines, {
      comparator: (a: NormalisedLine, b: NormalisedLine) => {
        if (a.text !== b.text) return false;
        const breakA = cleanA.slice(a.end, a.endWithBreak);
        const breakB = cleanB.slice(b.end, b.endWithBreak);
        if (opts.ignoreLineEndings) {
          const hasBreakA = breakA === '\n' || breakA === '\r\n' || breakA === '\r';
          const hasBreakB = breakB === '\n' || breakB === '\r\n' || breakB === '\r';
          return hasBreakA === hasBreakB;
        }
        return breakA === breakB;
      }
    });

    let idxA = 0;
    let idxB = 0;

    for (const part of rawChanges) {
      const count = part.count ?? 0;
      if (part.added) {
        for (let i = 0; i < count; i++) {
          const lineB = normB.lines[idxB++];
          if (lineB) {
            editOps.push({ kind: 'add', lineB });
            addedCount++;
          }
        }
      } else if (part.removed) {
        for (let i = 0; i < count; i++) {
          const lineA = normA.lines[idxA++];
          if (lineA) {
            editOps.push({ kind: 'del', lineA });
            removedCount++;
          }
        }
      } else {
        for (let i = 0; i < count; i++) {
          const lineA = normA.lines[idxA++];
          const lineB = normB.lines[idxB++];
          if (lineA && lineB) {
            editOps.push({ kind: 'context', lineA, lineB });
          }
        }
      }
    }
  }

  // Check identical
  if (addedCount === 0 && removedCount === 0) {
    return {
      identical: true,
      changes: [],
      hunks: [],
      stats: { added: 0, removed: 0 }
    };
  }

  // Find all indices of change ops
  const changeIndices: number[] = [];
  for (let i = 0; i < editOps.length; i++) {
    if (editOps[i]?.kind !== 'context') {
      changeIndices.push(i);
    }
  }

  const CONTEXT = 3;
  const hunkRanges: { start: number; end: number }[] = [];

  for (const chIdx of changeIndices) {
    const rangeStart = Math.max(0, chIdx - CONTEXT);
    const rangeEnd = Math.min(editOps.length - 1, chIdx + CONTEXT);

    const prev = hunkRanges[hunkRanges.length - 1];
    if (prev && rangeStart <= prev.end + 1) {
      prev.end = Math.max(prev.end, rangeEnd);
    } else {
      hunkRanges.push({ start: rangeStart, end: rangeEnd });
    }
  }

  const hunks: Hunk[] = [];
  const charChanges: CharChange[] = [];

  let currentOffsetA = 0;
  let currentOffsetB = 0;

  let currentDels: NormalisedLine[] = [];
  let currentAdds: NormalisedLine[] = [];

  const flushBlock = (targetHunkLines: DiffLine[]) => {
    if (currentDels.length === 0 && currentAdds.length === 0) return;

    const pairsCount = Math.min(currentDels.length, currentAdds.length);

    // 1. Paired lines: intra-line highlighting
    for (let p = 0; p < pairsCount; p++) {
      const lineA = currentDels[p]!;
      const lineB = currentAdds[p]!;

      // Skip intra-line highlighting if either line > 10,000 chars
      if (lineA.original.length > 10000 || lineB.original.length > 10000) {
        targetHunkLines.push({
          kind: 'del',
          oldNo: lineA.originalLineNo,
          text: lineA.original
        });
        targetHunkLines.push({
          kind: 'add',
          newNo: lineB.originalLineNo,
          text: lineB.original
        });
        charChanges.push({
          fromA: lineA.start,
          toA: lineA.endWithBreak,
          fromB: lineB.start,
          toB: lineB.endWithBreak
        });
      } else {
        const intra =
          opts.granularity === 'char'
            ? diffChars(lineA.original, lineB.original)
            : diffWordsWithSpace(lineA.original, lineB.original);

        const spansA: InlineSpan[] = [];
        const spansB: InlineSpan[] = [];
        let offA = 0;
        let offB = 0;

        let chStartA = 0;
        let chStartB = 0;
        let inChange = false;

        for (const item of intra) {
          if (item.removed) {
            if (!inChange) {
              chStartA = offA;
              chStartB = offB;
              inChange = true;
            }
            const len = item.value.length;
            spansA.push({ from: offA, to: offA + len, kind: 'del' });
            offA += len;
          } else if (item.added) {
            if (!inChange) {
              chStartA = offA;
              chStartB = offB;
              inChange = true;
            }
            const len = item.value.length;
            spansB.push({ from: offB, to: offB + len, kind: 'add' });
            offB += len;
          } else {
            if (inChange) {
              charChanges.push({
                fromA: lineA.start + chStartA,
                toA: lineA.start + offA,
                fromB: lineB.start + chStartB,
                toB: lineB.start + offB
              });
              inChange = false;
            }
            const len = item.value.length;
            offA += len;
            offB += len;
          }
        }

        if (inChange) {
          charChanges.push({
            fromA: lineA.start + chStartA,
            toA: lineA.start + offA,
            fromB: lineB.start + chStartB,
            toB: lineB.start + offB
          });
        }

        // Handle line break differences between paired lines
        const breakA = cleanA.slice(lineA.end, lineA.endWithBreak);
        const breakB = cleanB.slice(lineB.end, lineB.endWithBreak);
        if (breakA !== breakB) {
          charChanges.push({
            fromA: lineA.end,
            toA: lineA.endWithBreak,
            fromB: lineB.end,
            toB: lineB.endWithBreak
          });
        }

        targetHunkLines.push({
          kind: 'del',
          oldNo: lineA.originalLineNo,
          text: lineA.original,
          inline: spansA.length > 0 ? spansA : undefined
        });
        targetHunkLines.push({
          kind: 'add',
          newNo: lineB.originalLineNo,
          text: lineB.original,
          inline: spansB.length > 0 ? spansB : undefined
        });
      }

      currentOffsetA = lineA.endWithBreak;
      currentOffsetB = lineB.endWithBreak;
    }

    // 2. Unpaired deletions
    for (let p = pairsCount; p < currentDels.length; p++) {
      const lineA = currentDels[p]!;
      targetHunkLines.push({
        kind: 'del',
        oldNo: lineA.originalLineNo,
        text: lineA.original
      });
      charChanges.push({
        fromA: lineA.start,
        toA: lineA.endWithBreak,
        fromB: currentOffsetB,
        toB: currentOffsetB
      });
      currentOffsetA = lineA.endWithBreak;
    }

    // 3. Unpaired additions
    for (let p = pairsCount; p < currentAdds.length; p++) {
      const lineB = currentAdds[p]!;
      targetHunkLines.push({
        kind: 'add',
        newNo: lineB.originalLineNo,
        text: lineB.original
      });
      charChanges.push({
        fromA: currentOffsetA,
        toA: currentOffsetA,
        fromB: lineB.start,
        toB: lineB.endWithBreak
      });
      currentOffsetB = lineB.endWithBreak;
    }

    currentDels = [];
    currentAdds = [];
  };

  let currentHunkIdx = 0;
  let activeHunkLines: DiffLine[] | null = null;
  let oldStart = 1;
  let newStart = 1;
  let oldLines = 0;
  let newLines = 0;
  let foundFirstOld = false;
  let foundFirstNew = false;

  for (let i = 0; i < editOps.length; i++) {
    const op = editOps[i]!;
    const curHunk = hunkRanges[currentHunkIdx];
    const isInHunk = curHunk && i >= curHunk.start && i <= curHunk.end;

    if (isInHunk && !activeHunkLines) {
      activeHunkLines = [];
      oldStart = 1;
      newStart = 1;
      oldLines = 0;
      newLines = 0;
      foundFirstOld = false;
      foundFirstNew = false;
    }

    if (op.kind === 'context') {
      if (activeHunkLines) {
        flushBlock(activeHunkLines);
      } else {
        const dummy: DiffLine[] = [];
        flushBlock(dummy);
      }

      if (isInHunk && activeHunkLines) {
        if (!foundFirstOld) {
          oldStart = op.lineA.originalLineNo;
          foundFirstOld = true;
        }
        if (!foundFirstNew) {
          newStart = op.lineB.originalLineNo;
          foundFirstNew = true;
        }
        oldLines++;
        newLines++;

        activeHunkLines.push({
          kind: 'context',
          oldNo: op.lineA.originalLineNo,
          newNo: op.lineB.originalLineNo,
          text: op.lineA.original
        });
      }

      currentOffsetA = op.lineA.endWithBreak;
      currentOffsetB = op.lineB.endWithBreak;
    } else if (op.kind === 'del') {
      if (isInHunk && activeHunkLines) {
        if (!foundFirstOld) {
          oldStart = op.lineA.originalLineNo;
          foundFirstOld = true;
        }
        oldLines++;
      }
      currentDels.push(op.lineA);
    } else if (op.kind === 'add') {
      if (isInHunk && activeHunkLines) {
        if (!foundFirstNew) {
          newStart = op.lineB.originalLineNo;
          foundFirstNew = true;
        }
        newLines++;
      }
      currentAdds.push(op.lineB);
    }

    if (curHunk && i === curHunk.end && activeHunkLines) {
      flushBlock(activeHunkLines);
      hunks.push({
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: activeHunkLines
      });
      activeHunkLines = null;
      currentHunkIdx++;
    }
  }

  const trailingDummy: DiffLine[] = [];
  flushBlock(trailingDummy);

  // Sort and merge adjacent charChanges
  charChanges.sort((a, b) => {
    if (a.fromA !== b.fromA) return a.fromA - b.fromA;
    return a.fromB - b.fromB;
  });

  const mergedChanges: CharChange[] = [];
  for (const ch of charChanges) {
    const prev = mergedChanges[mergedChanges.length - 1];
    if (prev && prev.toA >= ch.fromA && prev.toB >= ch.fromB) {
      prev.toA = Math.max(prev.toA, ch.toA);
      prev.toB = Math.max(prev.toB, ch.toB);
    } else {
      mergedChanges.push({ ...ch });
    }
  }

  return {
    identical: false,
    changes: mergedChanges,
    hunks,
    stats: {
      added: addedCount,
      removed: removedCount
    }
  };
}

/**
 * Reconstructs the modified text B from text A and the sorted CharChanges.
 * Used for verifying that character changes correctly transform A into B.
 */
export function applyChanges(textA: string, textB: string, changes: CharChange[]): string {
  let result = '';
  let lastA = 0;

  for (const ch of changes) {
    result += textA.slice(lastA, ch.fromA);
    result += textB.slice(ch.fromB, ch.toB);
    lastA = ch.toA;
  }

  result += textA.slice(lastA);
  return result;
}
