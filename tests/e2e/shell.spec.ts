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
    await expect(toggle).toContainText('My Other Tools');

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

  test('navigation items appear in order: My Other Tools, Hire Me, Support my work', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Desktop nav text assertion');
    await page.goto('./');

    const navItems = page.locator('nav.site-nav > ul > li');
    await expect(navItems.nth(0)).toContainText('My Other Tools');
    await expect(navItems.nth(1)).toContainText('Hire Me');
    await expect(navItems.nth(2)).toContainText('Support my work');
  });

  test('no intro block, hidden h1 kept', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByText('Compare text files, source code')).toHaveCount(0);
    const h1 = page.locator('h1');
    await expect(h1).toHaveText('Diff Checker');
    const box = await h1.boundingBox();
    expect(box === null || box.width <= 1).toBe(true);
  });

  test('mode tabs are compact and stay on one line at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('./');
    for (const name of ['Text', 'Notebook']) {
      const tab = page.getByRole('tab', { name, exact: true });
      await expect(tab).toBeVisible();
      const height = await tab.evaluate((el) => el.getBoundingClientRect().height);
      expect(height).toBeLessThanOrEqual(48);
    }
  });

  test('footer is one row on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop only');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');
    const footer = page.locator('footer.site-footer');
    await expect(footer).toContainText('Runs entirely in your browser');
    const links: [string, string][] = [
      ['Hire Me', 'https://u77w41.github.io/resume/'],
      ['Anurup', 'https://u77w41.github.io/anurup/'],
      ['Source', 'https://github.com/U77w41/diff-checker'],
      ['Support my work', 'https://u77w41.github.io/support-my-work/']
    ];
    const tops: number[] = [];
    for (const [name, href] of links) {
      const link = footer.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', href);
      tops.push((await link.boundingBox())!.y);
    }
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4);
    const meta = await footer.locator('.footer-meta').boundingBox();
    expect(Math.abs(meta!.y - tops[0]!)).toBeLessThanOrEqual(8);
  });

  test('footer stacks centred on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('./');
    const meta = page.locator('.footer-meta');
    const nav = page.locator('footer .footer-nav');
    await expect(meta).toHaveCSS('text-align', 'center');
    await expect(nav).toHaveCSS('justify-content', 'center');
    const metaBox = await meta.boundingBox();
    const navBox = await nav.boundingBox();
    expect(navBox!.y).toBeGreaterThanOrEqual(metaBox!.y + metaBox!.height - 1);
  });
});
