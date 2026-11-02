import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadCsp(): Record<string, string[]> {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
  const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  if (!match?.[1]) throw new Error('CSP meta tag not found in index.html');
  const directives: Record<string, string[]> = {};
  for (const part of match[1].split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) directives[name] = values;
  }
  return directives;
}

describe('Content Security Policy (index.html)', () => {
  const csp = loadCsp();

  it('blocks form submissions entirely', () => {
    expect(csp['form-action']).toEqual(["'none'"]);
  });

  it('does not allow data: frames', () => {
    expect(csp['frame-src']).toEqual(["'self'", 'blob:']);
  });

  it('keeps the core script, object and base-uri restrictions', () => {
    expect(csp['script-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
  });
});
