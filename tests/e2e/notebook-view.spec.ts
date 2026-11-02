import { test, expect } from '@playwright/test';
import { NOTEBOOK_CHANGE_LINK, codeNotebook, notebookLink } from './helpers';

test.describe('Notebook side-by-side view', () => {
  test('notebook diffs default to side-by-side', async ({ page }) => {
    await page.goto(NOTEBOOK_CHANGE_LINK);
    await expect(page.locator('.split-hunks').first()).toBeVisible();
    await expect(page.locator('.split-text.left.is-del').first()).toContainText('print("a")');
    await expect(page.locator('.split-text.right.is-add').first()).toContainText('print("b")');
  });

  test('toggle switches notebook diffs to unified and the choice is shared', async ({ page }) => {
    await page.goto(NOTEBOOK_CHANGE_LINK);
    await expect(page.locator('.split-hunks').first()).toBeVisible();
    await page.locator('.filter-bar').getByRole('button', { name: 'Unified' }).click();
    await expect(page.locator('.split-hunks')).toHaveCount(0);
    await expect(page.locator('.code-line.line-del').first()).toBeVisible();

    await page.getByRole('tab', { name: /Text/ }).click();
    await expect(page.getByRole('button', { name: 'Unified', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('long unbroken token wraps inside the cell', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const token = 'u=' + 'A'.repeat(300);
    await page.goto(notebookLink(codeNotebook('x = 1'), codeNotebook(token)));
    const split = page.locator('.split-hunks').first();
    await expect(split).toBeVisible();
    const fits = await split.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(fits).toBe(true);
  });

  test('one notebook shows a hint, not an error, then diffs when both are added', async ({
    page
  }) => {
    const original = await (await page.request.get('./examples/original.ipynb')).text();
    const modified = await (await page.request.get('./examples/modified.ipynb')).text();
    await page.goto('./#notebook');
    await page.locator('#input-a').fill(original);
    await expect(page.getByRole('status').filter({ hasText: 'Add the other notebook' })).toHaveText(
      'Add the other notebook to compare.'
    );
    await expect(page.getByText(/Invalid notebook JSON/)).toHaveCount(0);

    await page.locator('#input-b').fill(modified);
    await expect(page.locator('.cell-card').first()).toBeVisible();
  });

  test('switching tabs with one notebook loaded never shows the JSON error', async ({ page }) => {
    const original = await (await page.request.get('./examples/original.ipynb')).text();
    await page.goto('./#notebook');
    await page.locator('#input-a').fill(original);
    await expect(page.getByText('Add the other notebook to compare.')).toBeVisible();
    await page.getByRole('tab', { name: /Text/ }).click();
    await expect(page.getByText(/Invalid notebook JSON/)).toHaveCount(0);
    await page.getByRole('tab', { name: /Notebook/ }).click();
    await expect(page.getByText('Add the other notebook to compare.')).toBeVisible();
    await expect(page.getByText(/Invalid notebook JSON/)).toHaveCount(0);
  });
});
