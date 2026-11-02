import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

async function generateIcons() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  const svgPath = `M12 3L12 21M14.7107 19.3887C17.1796 18.8321 19.1072 16.979 19.6863 14.6058C20.1046 12.8918 20.1046 11.1081 19.6863 9.39419C19.1072 7.02094 17.1796 5.16789 14.7107 4.61121M12 4.30969C11.0904 4.30969 10.1808 4.41019 9.28927 4.61121C6.82045 5.16789 4.89278 7.02094 4.31367 9.39419C3.89544 11.1081 3.89544 12.8918 4.31367 14.6058C4.89278 16.979 6.82045 18.8321 9.28928 19.3887C10.1808 19.5898 11.0904 19.6903 12 19.6903`;

  // Template generator
  function getHtml(size, paddingRatio) {
    const iconSize = Math.round(size * (1 - paddingRatio * 2));
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${size}px;
      height: ${size}px;
      background-color: #f5f5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    svg {
      width: ${iconSize}px;
      height: ${iconSize}px;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${svgPath}" stroke="#363853" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</body>
</html>`;
  }

  const targets = [
    { file: 'pwa-192.png', size: 192, padding: 0.15 },
    { file: 'pwa-512.png', size: 512, padding: 0.15 },
    { file: 'pwa-maskable-512.png', size: 512, padding: 0.22 }, // maskable requires safe zone padding >= 20%
    { file: 'apple-touch-icon.png', size: 180, padding: 0.15 }
  ];

  for (const target of targets) {
    await page.setViewportSize({ width: target.size, height: target.size });
    await page.setContent(getHtml(target.size, target.padding));
    const outPath = path.join(publicDir, target.file);
    await page.screenshot({ path: outPath, type: 'png', omitBackground: false });
    console.log(`Generated ${target.file} (${target.size}x${target.size})`);
  }

  // Generate 32x32 favicon.ico with standard ICO header wrapping 32x32 PNG
  await page.setViewportSize({ width: 32, height: 32 });
  await page.setContent(getHtml(32, 0.1));
  const png32 = await page.screenshot({ type: 'png', omitBackground: false });

  const icoHeader = Buffer.alloc(22);
  // Reserved (0)
  icoHeader.writeUInt16LE(0, 0);
  // Type (1 for icon)
  icoHeader.writeUInt16LE(1, 2);
  // Count (1 image)
  icoHeader.writeUInt16LE(1, 4);
  // Entry: width 32, height 32
  icoHeader.writeUInt8(32, 6);
  icoHeader.writeUInt8(32, 7);
  // Colors (0)
  icoHeader.writeUInt8(0, 8);
  // Reserved (0)
  icoHeader.writeUInt8(0, 9);
  // Planes (1)
  icoHeader.writeUInt16LE(1, 10);
  // BPP (32)
  icoHeader.writeUInt16LE(32, 12);
  // Size in bytes
  icoHeader.writeUInt32LE(png32.length, 14);
  // Offset of image data
  icoHeader.writeUInt32LE(22, 18);

  const icoBuffer = Buffer.concat([icoHeader, png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`Generated favicon.ico (32x32 ICO wrapping PNG)`);

  await browser.close();
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
