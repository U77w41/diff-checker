import type { Notebook } from '../nb-parse/types';
import type { MetadataDiff } from './types';

const NOISY_KEYS = new Set(['collapsed', 'scrolled', 'ExecuteTime', 'execution', 'jupyter']);

function isNoisyKey(key: string): boolean {
  if (NOISY_KEYS.has(key)) return true;
  if (key.startsWith('jupyter.') || key.startsWith('jupyter_')) return true;
  return false;
}

/**
 * Diffs metadata key-by-key, suppressing noisy metadata when requested.
 */
export function diffMetadata(
  metaA: Record<string, unknown>,
  metaB: Record<string, unknown>,
  hideNoisyMetadata: boolean
): MetadataDiff {
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const changed: Record<string, { a: unknown; b: unknown }> = {};
  const hiddenKeys: string[] = [];

  const allKeys = new Set([...Object.keys(metaA), ...Object.keys(metaB)]);

  for (const key of allKeys) {
    if (hideNoisyMetadata && isNoisyKey(key)) {
      hiddenKeys.push(key);
      continue;
    }

    const hasA = Object.prototype.hasOwnProperty.call(metaA, key);
    const hasB = Object.prototype.hasOwnProperty.call(metaB, key);

    if (hasA && !hasB) {
      removed[key] = metaA[key];
    } else if (!hasA && hasB) {
      added[key] = metaB[key];
    } else if (hasA && hasB) {
      const valA = metaA[key];
      const valB = metaB[key];

      const strA = typeof valA === 'object' && valA !== null ? JSON.stringify(valA) : String(valA);
      const strB = typeof valB === 'object' && valB !== null ? JSON.stringify(valB) : String(valB);

      if (strA !== strB) {
        changed[key] = { a: valA, b: valB };
      }
    }
  }

  return {
    added,
    removed,
    changed,
    hiddenKeys
  };
}

/**
 * Diffs top-level notebook header fields:
 * kernelspec.name, language_info.name, language_info.version, nbformat
 */
export function diffNotebookHeader(
  nbA: Notebook,
  nbB: Notebook
): { field: string; a: unknown; b: unknown }[] {
  const header: { field: string; a: unknown; b: unknown }[] = [];

  // kernelspec.name
  const kA = (nbA.metadata?.kernelspec as Record<string, unknown> | undefined)?.name;
  const kB = (nbB.metadata?.kernelspec as Record<string, unknown> | undefined)?.name;
  if (kA !== kB) {
    header.push({ field: 'kernelspec.name', a: kA, b: kB });
  }

  // language_info.name
  const langA = (nbA.metadata?.language_info as Record<string, unknown> | undefined)?.name;
  const langB = (nbB.metadata?.language_info as Record<string, unknown> | undefined)?.name;
  if (langA !== langB) {
    header.push({ field: 'language_info.name', a: langA, b: langB });
  }

  // language_info.version
  const vA = (nbA.metadata?.language_info as Record<string, unknown> | undefined)?.version;
  const vB = (nbB.metadata?.language_info as Record<string, unknown> | undefined)?.version;
  if (vA !== vB) {
    header.push({ field: 'language_info.version', a: vA, b: vB });
  }

  // nbformat version
  const nbVerA = `nbformat ${nbA.nbformat}.${nbA.nbformatMinor}`;
  const nbVerB = `nbformat ${nbB.nbformat}.${nbB.nbformatMinor}`;
  if (nbVerA !== nbVerB) {
    header.push({ field: 'nbformat', a: nbVerA, b: nbVerB });
  }

  return header;
}
