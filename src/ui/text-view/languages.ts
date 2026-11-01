import type { Extension } from '@codemirror/state';

export interface LanguageOption {
  id: string;
  label: string;
  extensions: string[];
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'plain', label: 'Plain text', extensions: ['txt'] },
  { id: 'python', label: 'Python', extensions: ['py', 'pyw'] },
  { id: 'javascript', label: 'JavaScript', extensions: ['js', 'mjs', 'cjs', 'jsx'] },
  { id: 'typescript', label: 'TypeScript', extensions: ['ts', 'mts', 'cts', 'tsx'] },
  { id: 'json', label: 'JSON', extensions: ['json'] },
  { id: 'markdown', label: 'Markdown', extensions: ['md', 'markdown'] },
  { id: 'sql', label: 'SQL', extensions: ['sql'] },
  { id: 'yaml', label: 'YAML', extensions: ['yaml', 'yml'] },
  { id: 'html', label: 'HTML', extensions: ['html', 'htm'] },
  { id: 'css', label: 'CSS', extensions: ['css'] }
];

export function detectLanguageFromFilename(fileName: string | undefined): string {
  if (!fileName) return 'plain';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'plain';

  const match = SUPPORTED_LANGUAGES.find((lang) => lang.extensions.includes(ext));
  return match ? match.id : 'plain';
}

export async function loadLanguageExtension(langId: string): Promise<Extension[]> {
  switch (langId) {
    case 'python': {
      const { python } = await import('@codemirror/lang-python');
      return [python()];
    }
    case 'javascript': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return [javascript()];
    }
    case 'typescript': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return [javascript({ typescript: true })];
    }
    case 'json': {
      const { json } = await import('@codemirror/lang-json');
      return [json()];
    }
    case 'markdown': {
      const { markdown } = await import('@codemirror/lang-markdown');
      return [markdown()];
    }
    case 'sql': {
      const { sql } = await import('@codemirror/lang-sql');
      return [sql()];
    }
    case 'yaml': {
      const { yaml } = await import('@codemirror/lang-yaml');
      return [yaml()];
    }
    case 'html': {
      const { html } = await import('@codemirror/lang-html');
      return [html()];
    }
    case 'css': {
      const { css } = await import('@codemirror/lang-css');
      return [css()];
    }
    default:
      return [];
  }
}
