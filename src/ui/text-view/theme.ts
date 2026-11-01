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
  // Additions and deletions in CodeMirror merge views
  '.cm-insertedLine': {
    backgroundColor: 'var(--diff-add-bg) !important'
  },
  '.cm-deletedLine': {
    backgroundColor: 'var(--diff-del-bg) !important'
  },
  '.cm-changeInsert': {
    backgroundColor: 'var(--diff-add-strong) !important'
  },
  '.cm-changeDelete': {
    backgroundColor: 'var(--diff-del-strong) !important'
  },
  '.cm-changeGutter': {
    width: '18px'
  },
  '.cm-insertedGutter': {
    color: 'var(--diff-add-marker) !important',
    fontWeight: 'bold'
  },
  '.cm-deletedGutter': {
    color: 'var(--diff-del-marker) !important',
    fontWeight: 'bold'
  }
});
