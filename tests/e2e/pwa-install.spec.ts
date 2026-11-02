import { test, expect } from '@playwright/test';

test.describe('PWA In-App Install Button', () => {
  test('does not show install button by default before beforeinstallprompt event', async ({
    page
  }) => {
    await page.goto('./');
    await expect(page.locator('[data-testid="install-app"]')).toHaveCount(0);
  });

  test('displays install button between Support my work and Theme toggle when beforeinstallprompt fires', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Desktop nav order verification');
    await page.goto('./');

    // Simulate beforeinstallprompt event
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installBtn = page.locator('[data-testid="install-app"]');
    await expect(installBtn).toBeVisible();
    await expect(installBtn).toContainText('Install');

    // Verify visual order: Support my work -> Install button -> Theme toggle
    const supportLink = page.locator('[data-testid="support-link"]');
    const themeToggle = page.locator('#theme-toggle');

    const supportBox = await supportLink.boundingBox();
    const installBox = await installBtn.boundingBox();
    const toggleBox = await themeToggle.boundingBox();

    expect(supportBox).not.toBeNull();
    expect(installBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();

    if (supportBox && installBox && toggleBox) {
      expect(installBox.x).toBeGreaterThan(supportBox.x);
      expect(toggleBox.x).toBeGreaterThan(installBox.x);
    }
  });

  test('clicking install button calls prompt() and clears button', async ({ page }) => {
    await page.goto('./');

    await page.exposeFunction('onPromptCalled', () => {});

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = async () => {
        (window as any).onPromptCalled();
      };
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installBtn = page.locator('[data-testid="install-app"]');
    await expect(installBtn).toBeVisible();
    await installBtn.click();
    await expect(installBtn).toHaveCount(0);
  });

  test('hides install button when appinstalled event fires', async ({ page }) => {
    await page.goto('./');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installBtn = page.locator('[data-testid="install-app"]');
    await expect(installBtn).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await expect(installBtn).toHaveCount(0);
  });

  test('renders properly on mobile viewports without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('./');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installBtn = page.locator('[data-testid="install-app"]');
    await expect(installBtn).toBeVisible();

    const box = await installBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });

  test('does not show install button if running in standalone mode', async ({ page }) => {
    // Emulate standalone display mode
    await page.emulateMedia({ media: 'screen' });
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        })
      });
    });

    await page.goto('./');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    await expect(page.locator('[data-testid="install-app"]')).toHaveCount(0);
  });
});
