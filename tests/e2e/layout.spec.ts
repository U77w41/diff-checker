import { test, expect } from '@playwright/test';

test.describe('Full-Width Fluid Layout', () => {
  test('header, main content, and footer expand to full width on 1920px desktop', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('./');

    const headerInner = page.locator('.header-inner');
    const headerBox = await headerInner.boundingBox();
    expect(headerBox).not.toBeNull();
    // At 1920px with 32px gutters on left and right, width should be 1920 - 64 = 1856px
    expect(headerBox!.width).toBeGreaterThanOrEqual(1800);

    const main = page.locator('#main');
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox!.width).toBe(1920);

    const footerRow = page.locator('.footer-row');
    const footerBox = await footerRow.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerBox!.width).toBeGreaterThanOrEqual(1800);
  });
});
