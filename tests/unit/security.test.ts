// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/ui/nb-view/renderers/markdown';

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
});
