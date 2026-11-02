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
    // At 1920px with 32px gutters, outer container is 1920px wide
    expect(headerBox!.width).toBe(1920);

    const main = page.locator('#main');
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox!.width).toBe(1920);

    const footerRow = page.locator('.footer-row');
    const footerBox = await footerRow.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerBox!.width).toBe(1920);
  });

  test('header content, workspace inputs, and footer align along the same left boundary', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');

    const brand = page.locator('.brand');
    const workspaceInputs = page.locator('.workspace-inputs');
    const footerMeta = page.locator('.footer-meta');

    const brandBox = await brand.boundingBox();
    const inputsBox = await workspaceInputs.boundingBox();
    const footerBox = await footerMeta.boundingBox();

    expect(brandBox).not.toBeNull();
    expect(inputsBox).not.toBeNull();
    expect(footerBox).not.toBeNull();

    // At 1440px, --gutter is 32px. All content should start at x = 32px
    expect(brandBox!.x).toBe(32);
    expect(inputsBox!.x).toBe(32);
    expect(footerBox!.x).toBe(32);

    // The workspace inputs should span from 32px to 1440 - 32 = 1408px (width = 1376px)
    expect(inputsBox!.width).toBe(1440 - 64);
  });

  for (const width of [375, 768, 1280, 1440, 1920]) {
    test(`has zero horizontal overflow at ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./');

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    });
  }
});
