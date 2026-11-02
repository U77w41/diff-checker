import { EditorView } from '@codemirror/view';

export const diffCheckerTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    backgroundColor: 'var(--card-background)',
    color: 'var(--text-main)'
  },
  '.cm-content': {
    fontFamily: 'var(--font-mono)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--card-background-muted)',
    color: 'var(--text-muted)',
    borderRight: '1px solid var(--border)'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent'
  },

  // Deleted lines (Side A in side-by-side, deleted chunks in unified)
  '&.cm-merge-a .cm-changedLine, .cm-deletedChunk, .cm-deletedLine': {
    backgroundColor: 'var(--diff-del-bg) !important'
  },
  // Intra-line deleted text highlights (words and characters)
  '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText, .cm-deletedLine .cm-deletedText':
    {
      background: 'var(--diff-del-strong) !important',
      borderRadius: '2px'
    },
  // Deleted line gutter markers
  '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': {
    color: 'var(--diff-del-marker) !important',
    fontWeight: 'bold'
  },

  // Added lines (Side B in side-by-side, inline changed lines in unified)
  '&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine, .cm-insertedLine': {
    backgroundColor: 'var(--diff-add-bg) !important'
  },
  // Intra-line added text highlights (words and characters)
  '&.cm-merge-b .cm-changedText, .cm-insertedLine .cm-changedText': {
    background: 'var(--diff-add-strong) !important',
    borderRadius: '2px'
  },
  // Added line gutter markers
  '&.cm-merge-b .cm-changedLineGutter, .cm-inlineChangedLineGutter': {
    color: 'var(--diff-add-marker) !important',
    fontWeight: 'bold'
  },

  // Collapsed unchanged lines
  '.cm-collapsedLines': {
    backgroundColor: 'var(--card-background-muted)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    cursor: 'pointer'
  }
});
