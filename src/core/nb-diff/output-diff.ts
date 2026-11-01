import { diffText } from '../text-diff/diff';
import type { NbOutput } from '../nb-parse/types';
import type { NbDiffOptions, OutputDiff } from './types';

const MIME_PRIORITY = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'text/html',
  'text/markdown',
  'text/latex',
  'text/plain'
];

const ANSI_REGEX = /\u001b\[[0-9;]*[a-zA-Z]/g;

export function stripANSI(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Extracts the preferred MIME representation for a rich output.
 */
function getPreferredMime(data: Record<string, string>): { mime: string; value: string } | null {
  for (const mime of MIME_PRIORITY) {
    if (typeof data[mime] === 'string') {
      return { mime, value: data[mime]! };
    }
  }
  // Check any remaining MIME type
  for (const [mime, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      return { mime, value };
    }
  }
  return null;
}

/**
 * Compares two outputs at the same position.
 */
function compareOutputPair(outA: NbOutput, outB: NbOutput, opts: NbDiffOptions): OutputDiff[] {
  if (outA.kind !== outB.kind) {
    return [
      { kind: 'removed', output: outA },
      { kind: 'added', output: outB }
    ];
  }

  if (outA.kind === 'stream' && outB.kind === 'stream') {
    if (outA.name !== outB.name) {
      return [
        { kind: 'removed', output: outA },
        { kind: 'added', output: outB }
      ];
    }
    const diff = diffText(outA.text, outB.text, opts);
    if (diff.identical) {
      return [{ kind: 'same' }];
    }
    return [{ kind: 'text', mime: 'text/plain', diff }];
  }

  if (outA.kind === 'error' && outB.kind === 'error') {
    const textA = stripANSI(`${outA.ename}: ${outA.evalue}\n` + outA.traceback.join('\n'));
    const textB = stripANSI(`${outB.ename}: ${outB.evalue}\n` + outB.traceback.join('\n'));
    const diff = diffText(textA, textB, opts);
    if (diff.identical) {
      return [{ kind: 'same' }];
    }
    return [{ kind: 'text', mime: 'application/vnd.jupyter.stderr', diff }];
  }

  if (outA.kind === 'rich' && outB.kind === 'rich') {
    const prefA = getPreferredMime(outA.data);
    const prefB = getPreferredMime(outB.data);

    if (!prefA || !prefB || prefA.mime !== prefB.mime) {
      return [
        { kind: 'removed', output: outA },
        { kind: 'added', output: outB }
      ];
    }

    const mime = prefA.mime;
    if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/svg+xml') {
      if (prefA.value === prefB.value) {
        return [{ kind: 'same' }];
      }
      return [{ kind: 'image', mime, a: prefA.value, b: prefB.value }];
    }

    if (mime === 'text/html') {
      const diff = diffText(prefA.value, prefB.value, opts);
      if (diff.identical) {
        return [{ kind: 'same' }];
      }
      return [{ kind: 'html', a: prefA.value, b: prefB.value, sourceDiff: diff }];
    }

    // text/markdown, text/latex, text/plain or other text
    const diff = diffText(prefA.value, prefB.value, opts);
    if (diff.identical) {
      return [{ kind: 'same' }];
    }
    return [{ kind: 'text', mime, diff }];
  }

  return [{ kind: 'same' }];
}

/**
 * Diffs outputs of two code cells position-by-position.
 */
export function diffOutputs(
  outputsA: NbOutput[],
  outputsB: NbOutput[],
  opts: NbDiffOptions
): OutputDiff[] {
  const result: OutputDiff[] = [];
  const maxLen = Math.max(outputsA.length, outputsB.length);

  for (let i = 0; i < maxLen; i++) {
    const a = outputsA[i];
    const b = outputsB[i];

    if (a && b) {
      const pairDiffs = compareOutputPair(a, b, opts);
      result.push(...pairDiffs);
    } else if (a && !b) {
      result.push({ kind: 'removed', output: a });
    } else if (!a && b) {
      result.push({ kind: 'added', output: b });
    }
  }

  return result;
}
