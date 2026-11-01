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

/**
 * Sanitizes HTML using DOMPurify to guarantee that no malicious payload executes.
 */
export async function sanitizeHtml(html: string): Promise<string> {
  const purify =
    typeof DOMPurify.sanitize === 'function'
      ? DOMPurify
      : typeof DOMPurify === 'function' && typeof window !== 'undefined'
        ? DOMPurify(window)
        : null;

  if (purify) {
    return purify.sanitize(html);
  }
  return html;
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
