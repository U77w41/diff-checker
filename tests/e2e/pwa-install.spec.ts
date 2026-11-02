import { test, expect } from '@playwright/test';

interface MockBeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface WindowWithPromptCallback extends Window {
  onPromptCalled?: () => void;
}

test.describe('PWA In-App Install Button', () => {
  test('shows install button by default in browser situated between Support my work and Theme toggle', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Desktop nav order verification');
    await page.goto('./');

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

  test('clicking install button without beforeinstallprompt opens guidance dialog', async ({
    page
  }) => {
    await page.goto('./');

    const installBtn = page.locator('[data-testid="install-app"]');
    await expect(installBtn).toBeVisible();
    await installBtn.click();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#install-title')).toHaveText('Install Diff Checker');

    // Close dialog with Got it
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('clicking install button with beforeinstallprompt event calls prompt()', async ({
    page
  }) => {
    await page.goto('./');

    await page.exposeFunction('onPromptCalled', () => {});

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as MockBeforeInstallPromptEvent;
      event.prompt = async () => {
        (window as WindowWithPromptCallback).onPromptCalled?.();
      };
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    const installBtn = page.locator('[data-testid="install-app"]');
    await expect(installBtn).toBeVisible();
    await installBtn.click();

    // Dialog should not open because native prompt was handled
    await expect(page.locator('div[role="dialog"]')).toHaveCount(0);
  });

  test('hides install button when appinstalled event fires', async ({ page }) => {
    await page.goto('./');

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
    await expect(page.locator('[data-testid="install-app"]')).toHaveCount(0);
  });
});
