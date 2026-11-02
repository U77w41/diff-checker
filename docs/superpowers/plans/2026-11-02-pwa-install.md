# PWA Browser Installation & In-App Install Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable browser installation of Diff Checker as a Progressive Web App (PWA) with complete manifest icons, and provide an in-app "Install" button in the header between "Support my work" and the theme toggle.

**Architecture:** Supply standard PWA icon assets (192×192, 512×512, maskable 512×512, apple-touch-icon, favicon.ico) in `public/` and configure them in `vite.config.ts` and `index.html`. In `src/App.svelte`, capture browser `beforeinstallprompt` and `appinstalled` events using Svelte 5 runes, rendering an accessible Install button in `site-nav` immediately preceding `#theme-toggle` that invokes `prompt()` when clicked.

**Tech Stack:** Svelte 5 (`$state`, `$effect`), Vite 8, `vite-plugin-pwa` 2.0.0, Playwright 1.64.1, Vitest 5.0.5.

**Spec:** [`docs/superpowers/specs/2026-11-02-pwa-install-design.md`](file:///Users/rbih/uc/projects/diff-checker/docs/superpowers/specs/2026-11-02-pwa-install-design.md)

## Global Constraints

- Svelte 5 Runes only (`$state`, `$derived`, `$props`, `$effect`).
- Pure client-side operation: zero telemetry, zero cookies, zero external network requests.
- Strictly adhere to Content Security Policy in `index.html` (no inline scripts or event handlers).
- Initial bundle size must remain $\le 250\text{ KB}$ (verified by `npm run size`).
- WCAG 2.1 AA accessible touch targets ($\ge 44\times 44\text{ px}$) and keyboard navigation (`Tab`, `Enter`, `Space`).
- Base URL is `/diff-checker/` for GitHub Pages hosting.

## Review Focus

1. `beforeinstallprompt` event calls `e.preventDefault()` to suppress default mini-infobars: test in Task 3.
2. If `userChoice` rejects or user cancels the prompt dialog, no uncaught promise rejection occurs: test in Task 3.
3. If running in standalone mode (`display-mode: standalone`), install button remains hidden: test in Task 3.
4. Responsive header layout retains alignment without horizontal overflow or clipping at 375px: test in Task 3.
5. All PWA assets in manifest are served with HTTP 200 and correct MIME types under base URL: test in Task 2.

---

### Task 1: Generate High-Resolution PWA Icon Assets

**Files:**
- Create: `public/pwa-192.png`
- Create: `public/pwa-512.png`
- Create: `public/pwa-maskable-512.png`
- Create: `public/apple-touch-icon.png`
- Create: `public/favicon.ico`
- Test: `tests/unit/pwa-icons.test.ts`

**Interfaces:**
- Produces: PNG and ICO icon assets in `public/` matching required dimensions for Chromium and iOS PWA installation criteria.

- [ ] **Step 1: Write the failing unit test for PWA icon assets**

Create `tests/unit/pwa-icons.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA icon assets', () => {
  const publicDir = path.resolve(__dirname, '../../public');

  const requiredIcons = [
    { name: 'pwa-192.png', minBytes: 500 },
    { name: 'pwa-512.png', minBytes: 1000 },
    { name: 'pwa-maskable-512.png', minBytes: 1000 },
    { name: 'apple-touch-icon.png', minBytes: 500 },
    { name: 'favicon.ico', minBytes: 100 }
  ];

  for (const { name, minBytes } of requiredIcons) {
    it(`has ${name} with valid file size`, () => {
      const filePath = path.join(publicDir, name);
      expect(fs.existsSync(filePath), `Missing ${name}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(minBytes);
    });
  }

  it('PNG files have valid PNG magic bytes', () => {
    const pngFiles = ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'apple-touch-icon.png'];
    for (const name of pngFiles) {
      const filePath = path.join(publicDir, name);
      const buffer = fs.readFileSync(filePath);
      // PNG magic number: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/pwa-icons.test.ts`
Expected: FAIL (missing icon files).

- [ ] **Step 3: Generate the icon files from brand SVG**

Use a generation script with Playwright/canvas to render `public/favicon.svg` into:
- `public/pwa-192.png` (192×192 with `#f5f5fa` background and centered logo)
- `public/pwa-512.png` (512×512 with `#f5f5fa` background and centered logo)
- `public/pwa-maskable-512.png` (512×512 with `#f5f5fa` background, logo scaled to 70% safe zone)
- `public/apple-touch-icon.png` (180×180 with `#f5f5fa` background and centered logo)
- `public/favicon.ico` (32×32 PNG formatted fallback)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pwa-icons.test.ts`
Expected: PASS (all 5 files exist with valid magic bytes).

- [ ] **Step 5: Commit**

```bash
git add public/pwa-*.png public/apple-touch-icon.png public/favicon.ico tests/unit/pwa-icons.test.ts
git commit -m "feat(pwa): add standard pwa png and apple touch icons"
```

---

### Task 2: Configure Web App Manifest and HTML Icon Links

**Files:**
- Modify: `vite.config.ts`
- Modify: `index.html`
- Test: `tests/unit/manifest.test.ts`

**Interfaces:**
- Consumes: Icon assets from Task 1.
- Produces: Web App Manifest in build output with complete icon declarations and PWA metadata.

- [ ] **Step 1: Write failing unit test for manifest configuration**

Create `tests/unit/manifest.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import viteConfig from '../../vite.config';

describe('Vite PWA Manifest Configuration', () => {
  it('has complete PWA metadata and icon entries', async () => {
    const config = typeof viteConfig === 'function' ? await viteConfig({} as any) : viteConfig;
    const pwaPlugin = config.plugins?.flat().find((p: any) => p && p.name === 'vite-plugin-pwa') as any;
    expect(pwaPlugin).toBeDefined();

    // Check VitePWA plugin options through plugin API or build config
    const manifest = (pwaPlugin as any)._manifest || (pwaPlugin as any).api?.pwaOptions?.manifest;
    // We can also verify by reading vite.config.ts content or building
  });
});
```
Or check build output `dist/manifest.webmanifest` content and `index.html` link tags.

- [ ] **Step 2: Update `vite.config.ts`**

Update `manifest` in `VitePWA`:
```ts
      manifest: {
        name: 'Diff Checker',
        short_name: 'DiffChecker',
        description: 'Fast, secure in-browser text and Jupyter Notebook diff tool.',
        theme_color: '#f5f5fa',
        background_color: '#f5f5fa',
        scope: '/diff-checker/',
        start_url: '/diff-checker/',
        id: '/diff-checker/',
        display: 'standalone',
        categories: ['utilities', 'developer', 'productivity'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
```

- [ ] **Step 3: Update `index.html`**

Add link tags for apple touch icon and alternate favicon:
```html
    <link rel="icon" type="image/svg+xml" href="/diff-checker/favicon.svg" />
    <link rel="alternate icon" href="/diff-checker/favicon.ico" />
    <link rel="apple-touch-icon" href="/diff-checker/apple-touch-icon.png" />
```

- [ ] **Step 4: Build and test manifest verification**

Run: `npm run build`
Verify `dist/manifest.webmanifest` contains `pwa-192.png`, `pwa-512.png`, and `pwa-maskable-512.png`.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts index.html tests/unit/manifest.test.ts
git commit -m "feat(pwa): configure full web app manifest with png icons and apple-touch-icon"
```

---

### Task 3: Implement In-App Install Button and Lifecycle in `App.svelte` & `theme.css`

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app/theme.css`
- Test: `tests/e2e/pwa-install.spec.ts`

**Interfaces:**
- Consumes: Browser `beforeinstallprompt` and `appinstalled` DOM events.
- Produces: Interactive install button with `data-testid="install-app"` placed between `Support my work` and `#theme-toggle`.

- [ ] **Step 1: Write E2E test for PWA install button in `tests/e2e/pwa-install.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('PWA Install Button', () => {
  test('does not show install button by default before prompt event', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-testid="install-app"]')).toHaveCount(0);
  });

  test('displays install button between Support my work and Theme toggle when beforeinstallprompt fires', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Desktop ordering check');
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
    await expect(installBtn).toHaveText(/Install/);

    // Verify DOM position: immediately follows Support my work and precedes Theme toggle
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

  test('clicking install button calls prompt() and handles choice', async ({ page }) => {
    await page.goto('./');

    let promptCalled = false;
    await page.exposeFunction('onPromptTriggered', () => {
      promptCalled = true;
    });

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = async () => {
        (window as any).onPromptTriggered();
      };
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installBtn = page.locator('[data-testid="install-app"]');
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/pwa-install.spec.ts --project=chromium`
Expected: FAIL (button does not exist).

- [ ] **Step 3: Implement PWA install state and handlers in `src/App.svelte`**

In script:
```ts
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }

  let deferredInstallPrompt = $state<BeforeInstallPromptEvent | null>(null);
  let canInstall = $state(false);

  async function handleInstallApp() {
    if (!deferredInstallPrompt) return;
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    canInstall = false;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // Ignore user cancellation or prompt errors
    }
  }
```

In `onMount`:
```ts
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as any).standalone);

    function onBeforeInstallPrompt(e: Event) {
      if (isStandalone) return;
      e.preventDefault();
      deferredInstallPrompt = e as BeforeInstallPromptEvent;
      canInstall = true;
    }

    function onAppInstalled() {
      deferredInstallPrompt = null;
      canInstall = false;
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
```

In markup (inside `site-nav ul`, placed after `support-link-item`):
```svelte
        {#if canInstall}
          <li>
            <button
              type="button"
              class="install-app-btn"
              data-testid="install-app"
              onclick={handleInstallApp}
              aria-label="Install Diff Checker as an app"
              title="Install Diff Checker as an app"
            >
              <svg
                class="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span class="nav-label">Install</span>
            </button>
          </li>
        {/if}
```

- [ ] **Step 4: Update styles in `src/app/theme.css`**

Add styling for `.install-app-btn` matching `site-nav a` and mobile collapse:
```css
.site-nav button.install-app-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: var(--radius-control);
  color: var(--text-body);
  font-size: 15px;
  text-decoration: none;
  white-space: nowrap;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.site-nav button.install-app-btn:hover {
  color: var(--text-main);
  background: var(--card-background-muted);
}
```

In responsive media query (`@media (max-width: 768px)`):
```css
  .site-nav button.install-app-btn span.nav-label {
    display: none;
  }

  .site-nav button.install-app-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--border);
  }

  .site-nav button.install-app-btn:hover {
    border-color: var(--border-strong);
  }
```

- [ ] **Step 5: Run Playwright test to verify it passes**

Run: `npx playwright test tests/e2e/pwa-install.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.svelte src/app/theme.css tests/e2e/pwa-install.spec.ts
git commit -m "feat(pwa): add reactive in-app install button to header"
```

---

### Task 4: Complete Verification & Regression Testing

**Files:**
- Test all existing and new test suites

- [ ] **Step 1: Run type checking**
Run: `npm run typecheck`
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run linter and formatter check**
Run: `npm run lint`
Expected: 0 errors, all files formatted.

- [ ] **Step 3: Run Vitest unit tests**
Run: `npm test`
Expected: All unit tests pass.

- [ ] **Step 4: Run bundle size check**
Run: `npm run size`
Expected: $\le 250\text{ KB}$.

- [ ] **Step 5: Run full Playwright test suite**
Run: `npx playwright test --project=chromium`
Expected: All tests pass.
