import { test, expect } from '@playwright/test';

test.describe('Branded shell and header/footer', () => {
  test('renders page title and header brand', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Diff Checker · Ujjwal Chowdhury/);

    const brand = page.locator('header a.brand');
    await expect(brand).toHaveAttribute('href', './');
    await expect(brand.locator('.brand-name')).toHaveText('Diff Checker');
  });

  test('Support my work links exist with correct attributes on desktop', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Desktop only');
    await page.goto('./');

    const topSupportLink = page.getByTestId('support-link');
    await expect(topSupportLink).toBeVisible();
    await expect(topSupportLink).toHaveAttribute(
      'href',
      'https://u77w41.github.io/support-my-work/'
    );
    await expect(topSupportLink).toHaveAttribute('target', '_blank');
    await expect(topSupportLink).toHaveAttribute('rel', 'noreferrer');

    const footerSupportLink = page.getByTestId('support-link-footer');
    await expect(footerSupportLink).toBeVisible();
    await expect(footerSupportLink).toHaveAttribute(
      'href',
      'https://u77w41.github.io/support-my-work/'
    );
    await expect(footerSupportLink).toHaveAttribute('target', '_blank');
    await expect(footerSupportLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('Support my work link is visible on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('./');

    const mobileSupportLink = page.getByTestId('support-link-mobile');
    await expect(mobileSupportLink).toBeVisible();
    await expect(mobileSupportLink).toHaveAttribute(
      'href',
      'https://u77w41.github.io/support-my-work/'
    );
    await expect(mobileSupportLink).toHaveAttribute('target', '_blank');
    await expect(mobileSupportLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('toggles theme between light and dark', async ({ page }) => {
    await page.goto('./');
    const html = page.locator('html');
    const toggle = page.locator('#theme-toggle');

    const initialScheme = await html.getAttribute('data-scheme');
    await toggle.click();
    const toggledScheme = await html.getAttribute('data-scheme');
    expect(toggledScheme).not.toBe(initialScheme);

    await toggle.click();
    const finalScheme = await html.getAttribute('data-scheme');
    expect(finalScheme).toBe(initialScheme);
  });

  test('loads directly in dark mode when StackColorScheme is dark in localStorage', async ({
    page
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('StackColorScheme', 'dark');
    });
    await page.goto('./');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-scheme', 'dark');
  });

  test('tools dropdown opens, displays anurup, and closes on escape and outside click', async ({
    page
  }) => {
    await page.goto('./');

    const toggle = page.locator('button.menu-social-dropdown-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-haspopup', 'true');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const panel = page.locator('#menu-social-dropdown-tools');
    await expect(panel).toBeHidden();

    // Open dropdown
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();

    // Check Anurup link inside
    const anurupLink = panel.locator('a[href="https://u77w41.github.io/anurup/"]');
    await expect(anurupLink).toBeVisible();
    await expect(anurupLink).toContainText('ANURUP');

    // Test Escape key closes dropdown and focuses toggle
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();

    // Test Outside click closes dropdown
    await toggle.click();
    await expect(panel).toBeVisible();
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('tools dropdown is properly positioned on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('./');

    const toggle = page.locator('button.menu-social-dropdown-toggle');
    await toggle.click();

    const panel = page.locator('#menu-social-dropdown-tools');
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });
});
