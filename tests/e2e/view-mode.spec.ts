import { test, expect } from '@playwright/test';
import LZString from 'lz-string';

const textLink = (a: string, b: string) =>
  './#s=' + LZString.compressToEncodedURIComponent(JSON.stringify({ mode: 'text', a, b }));

test.describe('View mode defaults and mobile access', () => {
  test('opens side-by-side even when unified was stored', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'diff-checker:settings',
        JSON.stringify({ viewMode: 'unified', similarityThreshold: 0.6 })
      );
    });
    await page.goto('./#text');
    await page.getByRole('button', { name: 'Try an example' }).click();
    await expect(page.locator('.editor-container .cm-editor')).toHaveCount(2);
  });

  test('mobile shows the view toggle and two editors', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('./#text');
    await page.getByRole('button', { name: 'Try an example' }).click();
    await expect(page.locator('.view-toggle-group')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Side-by-side' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('.editor-container .cm-editor')).toHaveCount(2);
  });

  test('long lines wrap and stay aligned at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const long = '# ' + 'word '.repeat(40);
    const a = `x\n${long}\nend\n`;
    const b = `x\n${long.replace('word word word', 'word WORD word')}\nend\n`;
    await page.goto(textLink(a, b));
    await expect(page.locator('.editor-container .cm-editor')).toHaveCount(2);

    const geometry = await page.evaluate(() => {
      const top = (side: string) =>
        [...document.querySelectorAll(`.cm-merge-${side} .cm-line`)]
          .find((l) => l.textContent?.startsWith('end'))
          ?.getBoundingClientRect().top ?? NaN;
      const content = document.querySelector('.cm-merge-a .cm-content') as HTMLElement;
      const scroller = content.closest('.cm-scroller') as HTMLElement;
      return { a: top('a'), b: top('b'), sw: scroller.scrollWidth, cw: scroller.clientWidth };
    });
    expect(Math.abs(geometry.a - geometry.b)).toBeLessThanOrEqual(1);
    expect(geometry.sw).toBeLessThanOrEqual(geometry.cw + 1);
  });
});
