import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Resolves markdown image attachment references (attachment:<name>) to data: URLs.
 */
export function resolveAttachments(
  content: string,
  attachments?: Record<string, Record<string, string>>
): string {
  if (!attachments) return content;
  let resolved = content;
  for (const [filename, mimeMap] of Object.entries(attachments)) {
    const firstMime = Object.keys(mimeMap)[0];
    if (firstMime && mimeMap[firstMime]) {
      const dataUrl = `data:${firstMime};base64,${mimeMap[firstMime]}`;
      const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`attachment:${escapedName}`, 'g');
      resolved = resolved.replace(pattern, dataUrl);
    }
  }
  return resolved;
}

/**
 * Lazy-loads KaTeX to render $$...$$ and $...$ math expressions without inflating the initial bundle.
 */
export async function renderMath(content: string): Promise<string> {
  const hasBlock = content.includes('$$');
  const hasInline = content.includes('$');
  if (!hasBlock && !hasInline) return content;

  try {
    const katex = (await import('katex')).default;

    // Block math: $$...$$
    let result = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return `$$${math}$$`;
      }
    });

    // Inline math: $...$ (disallowing newlines inside inline math)
    result = result.replace(/\$([^$\n]+?)\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `$${math}$`;
      }
    });

    return result;
  } catch {
    return content;
  }
}

/** Elements that let markdown imitate the app (fake forms) or restyle the page. */
export const FORBIDDEN_MARKDOWN_TAGS: readonly string[] = [
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'style'
];

const SANITIZE_CONFIG = {
  FORBID_TAGS: [...FORBIDDEN_MARKDOWN_TAGS],
  SANITIZE_NAMED_PROPS: true
};

const ALLOWED_POSITIONS = new Set(['', 'static', 'relative']);
const NAMED_PREFIX = 'user-content-'; // DOMPurify's SANITIZE_NAMED_PROPS prefix

function createPurifier(): ReturnType<typeof DOMPurify> | null {
  if (typeof window === 'undefined') return null;
  const purify = DOMPurify(window);
  if (typeof purify.sanitize !== 'function') return null;

  purify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof window.Element)) return;

    // Rebuild inline styles from the parsed CSSOM (HTML, SVG and MathML alike). Declarations
    // the parser can't read, including escaped names like posit\69on, are dropped.
    if (node.hasAttribute('style')) {
      const style = (node as Element & { style?: CSSStyleDeclaration }).style;
      if (!style) {
        node.removeAttribute('style'); // no CSSOM to vet it with: fail closed
      } else {
        if (!ALLOWED_POSITIONS.has(style.position)) style.removeProperty('position');
        const canonical = style.cssText.trim();
        if (canonical) node.setAttribute('style', canonical);
        else node.removeAttribute('style');
      }
    }

    // SANITIZE_NAMED_PROPS renames id/name to user-content-*; keep in-cell references working.
    for (const attr of ['href', 'usemap']) {
      const value = node.getAttribute(attr);
      if (value?.startsWith('#') && value.length > 1 && !value.startsWith(`#${NAMED_PREFIX}`)) {
        node.setAttribute(attr, `#${NAMED_PREFIX}${value.slice(1)}`);
      }
    }

    if (node.localName !== 'a') return;
    if (!(node instanceof window.HTMLElement)) {
      // SVG/MathML links can't carry rel=noopener reliably; make them inert.
      node.removeAttribute('href');
      node.removeAttribute('xlink:href');
      return;
    }
    // HTML links leave the app in a new tab instead of replacing the user's diff.
    const href = node.getAttribute('href');
    if (href && !href.startsWith('#')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return purify;
}

const purifier = createPurifier();

/** Fallback used when no sanitizer is available: show the markup as text. */
export function escapeHtmlFallback(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes rendered markdown. Fails closed: without DOMPurify the input is escaped.
 */
export function sanitizeHtml(html: string): string {
  if (!purifier) {
    console.warn('HTML sanitizer unavailable; showing markdown as plain text.');
    return escapeHtmlFallback(html);
  }
  return purifier.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Converts Markdown source into sanitized HTML with attachment resolution and KaTeX support.
 */
export async function renderMarkdown(
  source: string,
  attachments?: Record<string, Record<string, string>>
): Promise<string> {
  const withAttachments = resolveAttachments(source, attachments);
  const withMath = await renderMath(withAttachments);
  const rawHtml = await marked.parse(withMath);
  return sanitizeHtml(rawHtml);
}
