import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility audits (WCAG 2.1 AA via axe-core)', () => {
  test('initial empty page passes axe-core accessibility checks in light theme', async ({
    page
  }) => {
    await page.goto('./');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page passes axe-core accessibility checks in dark theme', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('StackColorScheme', 'dark');
    });
    await page.goto('./');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('active diff results pass axe-core checks', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Try an example' }).click();

    // Wait for diff results to load
    await expect(page.locator('.diff-stats')).toBeVisible();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard shortcuts modal passes axe-core checks', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('?');

    const modal = page.locator('.modal-card[role="dialog"]');
    await expect(modal).toBeVisible();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
