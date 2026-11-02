import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA icon assets', () => {
  const publicDir = path.resolve(__dirname, '../../public');

  const requiredIcons = [
    { name: 'pwa-192.png', minBytes: 500 },
    { name: 'pwa-512.png', minBytes: 1000 },
    { name: 'pwa-maskable-512.png', minBytes: 1000 },
    { name: 'apple-touch-icon.png', minBytes: 500 },
    { name: 'favicon.ico', minBytes: 100 }
  ];

  for (const { name, minBytes } of requiredIcons) {
    it(`has ${name} with valid file size`, () => {
      const filePath = path.join(publicDir, name);
      expect(fs.existsSync(filePath), `Missing ${name}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(minBytes);
    });
  }

  it('PNG files have valid PNG magic bytes', () => {
    const pngFiles = ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'apple-touch-icon.png'];
    for (const name of pngFiles) {
      const filePath = path.join(publicDir, name);
      const buffer = fs.readFileSync(filePath);
      // PNG magic number: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }
  });
});
