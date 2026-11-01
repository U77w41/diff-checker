import { test, expect } from '@playwright/test';
import { encodeSharePayload, type SharePayload } from '../../src/core/share';

test.describe('Phase 5 Features: Hash routing, Share links, Shortcuts, and Mobile UI', () => {
  test('loads diff directly from #s= share link in another browser context', async ({ page }) => {
    const payload: SharePayload = {
      mode: 'text',
      a: 'const x = 1;\nconsole.log(x);',
      b: 'const x = 2;\nconsole.log(x);',
      fileNameA: 'shared-a.js',
      fileNameB: 'shared-b.js'
    };

    const encoded = encodeSharePayload(payload);
    await page.goto(`./#s=${encoded.compressed}`);

    // Verify change stats visible in toolbar
    const stats = page.locator('.diff-stats');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText('+1');
    await expect(stats).toContainText('−1');

    // Click Edit inputs to expand panel and verify textareas
    await page.getByRole('button', { name: 'Edit inputs' }).click();
    const inputA = page.locator('#input-a');
    const inputB = page.locator('#input-b');
    await expect(inputA).toHaveValue(payload.a);
    await expect(inputB).toHaveValue(payload.b);
  });

  test('handles corrupted #s= share link by displaying error banner', async ({ page }) => {
    await page.goto('./#s=CORRUPT_NOT_VALID_BASE64_!!!');

    const errorBanner = page.locator('.status-banner.error');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('This share link is damaged');
  });

  test('switches mode via hash routing #notebook and #text', async ({ page }) => {
    await page.goto('./#notebook');
    const notebookTab = page.getByRole('tab', { name: /Jupyter Notebooks/i });
    await expect(notebookTab).toHaveAttribute('aria-selected', 'true');

    await page.goto('./#text');
    const textTab = page.getByRole('tab', { name: /Text & Scripts/i });
    await expect(textTab).toHaveAttribute('aria-selected', 'true');
  });

  test('opens and closes keyboard shortcuts modal via ? and Escape keys', async ({ page }) => {
    await page.goto('./');

    // Press ?
    await page.keyboard.press('?');
    const modal = page.locator('.modal-card[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('Keyboard Shortcuts');

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('loads bundled example pair on Try an example click', async ({ page }) => {
    await page.goto('./');
    const exampleBtn = page.getByRole('button', { name: 'Try an example' });
    await exampleBtn.click();

    // Wait for diff results
    const stats = page.locator('.diff-stats');
    await expect(stats).toBeVisible();

    // Expand inputs to verify populated
    const editBtn = page.getByRole('button', { name: 'Edit inputs' });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }
    const inputA = page.locator('#input-a');
    await expect(inputA).not.toHaveValue('');
  });

  test('mobile layout hides side-by-side and displays folded menu button', async ({
    page,
    isMobile
  }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('./');

    // Load example so toolbar appears
    await page.getByRole('button', { name: 'Try an example' }).click();

    // Side-by-side view button should be hidden on mobile
    const viewToggle = page.locator('.view-toggle-group');
    await expect(viewToggle).toBeHidden();

    // ⋯ Menu toggle should be visible
    const menuToggle = page.locator('.menu-toggle-btn');
    await expect(menuToggle).toBeVisible();

    // Clicking menu opens folded options
    await menuToggle.click();
    const mobilePanel = page.locator('.mobile-options-panel');
    await expect(mobilePanel).toBeVisible();
  });
});
