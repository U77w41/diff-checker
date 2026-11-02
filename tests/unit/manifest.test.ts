import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Web App Manifest & HTML Icon Configuration', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  const indexPath = path.join(rootDir, 'index.html');

  it('vite.config.ts configures PWA manifest with standard icons and metadata', () => {
    const content = fs.readFileSync(viteConfigPath, 'utf-8');

    // Basic metadata
    expect(content).toContain("name: 'Diff Checker'");
    expect(content).toContain("display: 'standalone'");
    expect(content).toContain("id: '/diff-checker/'");
    expect(content).toContain("categories: ['utilities'");

    // Required PNG icons
    expect(content).toContain("src: 'pwa-192.png'");
    expect(content).toContain("sizes: '192x192'");
    expect(content).toContain("src: 'pwa-512.png'");
    expect(content).toContain("sizes: '512x512'");
    expect(content).toContain("src: 'pwa-maskable-512.png'");
    expect(content).toContain("purpose: 'maskable'");
  });

  it('index.html links apple-touch-icon and alternate favicon', () => {
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain(
      '<link rel="apple-touch-icon" href="/diff-checker/apple-touch-icon.png"'
    );
    expect(content).toContain(
      '<link rel="alternate icon" href="/diff-checker/favicon.ico"'
    );
  });
});
