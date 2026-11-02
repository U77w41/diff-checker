export type InputMode = 'text' | 'notebook';

/**
 * Decides whether an input should be treated as a Jupyter notebook (.ipynb)
 * or plain text.
 * Rule: .ipynb extension, or JSON containing both `cells` and `nbformat`,
 * means notebook; anything else is text.
 */
export function detectInputMode(fileName?: string, content?: string): InputMode {
  if (fileName && fileName.trim().toLowerCase().endsWith('.ipynb')) {
    return 'notebook';
  }

  if (content && typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          'cells' in parsed &&
          'nbformat' in parsed
        ) {
          return 'notebook';
        }
      } catch {
        // Not valid JSON, falls through to text
      }
    }
  }

  return 'text';
}

/**
 * Notebook diffs need two notebooks. While either side is blank, wait instead of parsing
 * it (an empty or whitespace-only side would fail as invalid JSON).
 */
export function shouldWaitForSecondNotebook(mode: InputMode, a: string, b: string): boolean {
  if (mode !== 'notebook') return false;
  return a.trim() === '' || b.trim() === '';
}
