import { test, expect } from '@playwright/test';

test.describe('Text & Scripts Diff Checker Rendering', () => {
  test('renders side-by-side diff without errors (word & char granularity)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('./#text');

    const inputA = page.locator('#input-a');
    const inputB = page.locator('#input-b');

    await inputA.fill('const count = 10;\nconsole.log(count);\nreturn true;');
    await inputB.fill('const count = 20;\nconsole.log(count);\nreturn false;');

    await page.getByRole('button', { name: /Compare/i }).click();

    // Verify change stats visible
    await expect(page.locator('.diff-stats')).toBeVisible();

    // Verify editors mounted (Side A and Side B)
    const editors = page.locator('.editor-container .cm-editor');
    await expect(editors).toHaveCount(2);

    // Verify changed lines are decorated on both sides
    const sideA = page.locator('.cm-merge-a');
    const sideB = page.locator('.cm-merge-b');
    await expect(sideA.locator('.cm-changedLine').first()).toBeVisible();
    await expect(sideB.locator('.cm-changedLine').first()).toBeVisible();

    // Verify word intra-line changed text exists
    await expect(sideA.locator('.cm-changedText').first()).toBeVisible();
    await expect(sideB.locator('.cm-changedText').first()).toBeVisible();

    // Switch to character granularity
    const charBtn = page.getByRole('button', { name: 'Character', exact: true });
    await charBtn.click();
    await expect(charBtn).toHaveAttribute('aria-pressed', 'true');

    // Both editors must still be cleanly mounted and decorated
    await expect(editors).toHaveCount(2);
    await expect(sideA.locator('.cm-changedText').first()).toBeVisible();
    await expect(sideB.locator('.cm-changedText').first()).toBeVisible();

    // Test next/prev navigation in toolbar
    const nextBtn = page.getByRole('button', { name: 'Next change' });
    const prevBtn = page.getByRole('button', { name: 'Previous change' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await prevBtn.click();

    // Assert zero page errors occurred throughout
    expect(pageErrors).toEqual([]);
  });

  test('renders unified diff without errors (word & char granularity)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('./#text');

    const inputA = page.locator('#input-a');
    const inputB = page.locator('#input-b');

    await inputA.fill('hello world\nunchanged\nold line');
    await inputB.fill('hello planet\nunchanged\nnew line');

    // Switch to Unified mode
    await page.getByRole('button', { name: 'Unified', exact: true }).click();
    await page.getByRole('button', { name: /Compare/i }).click();

    // Verify change stats visible
    await expect(page.locator('.diff-stats')).toBeVisible();

    // In unified view, one editor is rendered
    const unifiedEditor = page.locator('.editor-container .cm-editor');
    await expect(unifiedEditor).toHaveCount(1);

    // Verify deleted chunks and added changed lines are present
    const deletedDecorations = page.locator('.cm-deletedChunk, .cm-deletedLine');
    await expect(deletedDecorations.first()).toBeVisible();

    const addedDecorations = page.locator('.cm-changedLine, .cm-inlineChangedLine');
    await expect(addedDecorations.first()).toBeVisible();

    // Switch to character granularity in unified mode
    const charBtn = page.getByRole('button', { name: 'Character', exact: true });
    await charBtn.click();
    await expect(charBtn).toHaveAttribute('aria-pressed', 'true');

    await expect(unifiedEditor).toHaveCount(1);
    await expect(deletedDecorations.first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('displays identical banner when inputs match', async ({ page }) => {
    await page.goto('./#text');

    const inputA = page.locator('#input-a');
    const inputB = page.locator('#input-b');

    await inputA.fill('identical content\nline 2');
    await inputB.fill('identical content\nline 2');

    await page.getByRole('button', { name: /Compare/i }).click();

    const banner = page.locator('.identical-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('No differences found');
    await expect(page.locator('.editor-container')).toHaveCount(0);
  });
});
