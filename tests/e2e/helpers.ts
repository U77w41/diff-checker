import LZString from 'lz-string';

/** Minimal nbformat 4 notebook with one code cell. */
export function codeNotebook(source: string): string {
  return JSON.stringify({
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {},
    cells: [{ cell_type: 'code', id: 'c1', metadata: {}, execution_count: 1, source, outputs: [] }]
  });
}

/** Share link (relative to the app base) for a notebook-mode comparison. */
export function notebookLink(a: string, b: string): string {
  return (
    './#s=' + LZString.compressToEncodedURIComponent(JSON.stringify({ mode: 'notebook', a, b }))
  );
}

export const NOTEBOOK_CHANGE_LINK = notebookLink(
  codeNotebook('print("a")\nx = 1'),
  codeNotebook('print("b")\nx = 1')
);
