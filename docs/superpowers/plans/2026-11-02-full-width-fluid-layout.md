# Full-Width Fluid Desktop Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove restrictive 960px and 1440px container max-widths, making Diff Checker a full-width fluid web app with responsive side padding matching Anurup across the header, inputs, diff viewer, and footer.

**Architecture:** Update CSS custom properties in `src/app/theme.css` to 100% fluid containers with responsive `--gutter` padding (`16px` mobile, `24px` tablet, `32px` desktop). Refactor container nesting in `src/App.svelte` to remove inner double-gutter padding so all sections align pixel-to-pixel. Verify with Playwright E2E layout tests.

**Tech Stack:** Svelte 5, CSS custom properties, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-full-width-fluid-layout-design.md`

## Global Constraints

- Pure client-side browser application with zero backend or telemetry.
- WCAG 2.1 AA accessibility (touch targets $\ge 44 \times 44$ px, proper focus rings).
- Initial JS bundle size budget $\le 250$ KB brotlied.
- Zero horizontal overflow (`scrollWidth === clientWidth`) across 320px to 4K viewports.
- Single quotes, semicolons terminated, 2-space indentation.

## Review Focus

1. **Dual input panels on ultra-wide screens (1920px+):** Inputs A and B must split width 50/50 evenly without breaking or overflowing.
2. **Double-gutter padding bug:** Header, input boxes, diff toolbar, and footer must align at identical left and right boundaries without nested indents.
3. **Mobile viewport ($\le 375$px):** Mode tabs, header nav, and footer must stack/wrap cleanly with `16px` gutter without horizontal scrollbar.
4. **Active diff views (CodeMirror & Notebook):** Must smoothly stretch to 100% available width without content clipping or horizontal overflow.
5. **Theme synchronization:** Ensure full-width background colors and borders apply seamlessly in both light and dark themes.

---

### Task 1: Update CSS Tokens & Container Rules in `theme.css`

**Files:**

- Modify: `src/app/theme.css:43-46`, `src/app/theme.css:197-209`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**

- Consumes: Existing `--gutter`, `--container`, `--container-wide` tokens in `src/app/theme.css`.
- Produces: Responsive `--gutter` tokens (`16px`, `24px`, `32px`) and `100%` width rules for `.container` and `.container-wide`.

- [x] **Step 1: Write failing layout E2E test in `tests/e2e/layout.spec.ts`**

```ts
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
    // At 1920px with 32px gutters on left and right, width should be 1920 - 64 = 1856px
    expect(headerBox!.width).toBeGreaterThanOrEqual(1800);

    const main = page.locator('#main');
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox!.width).toBe(1920);

    const footerRow = page.locator('.footer-row');
    const footerBox = await footerRow.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerBox!.width).toBeGreaterThanOrEqual(1800);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/layout.spec.ts --project=chromium`
Expected: FAIL (headerBox.width is 960px, not >= 1800px).

- [x] **Step 3: Update `src/app/theme.css` with fluid container tokens & responsive gutters**

In `src/app/theme.css`:

```css
--radius-card: 10px;
--radius-control: 8px;
--radius-tag: 4px;
--container: 100%;
--container-wide: 100%;
--gutter: 16px;
```

Add responsive gutter queries:

```css
@media (min-width: 768px) {
  :root {
    --gutter: 24px;
  }
}

@media (min-width: 1200px) {
  :root {
    --gutter: 32px;
  }
}
```

Update `.container` and `.container-wide`:

```css
.container,
.container-wide {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0 var(--gutter);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/layout.spec.ts --project=chromium`
Expected: PASS

- [x] **Step 5: Commit changes**

```bash
git add src/app/theme.css tests/e2e/layout.spec.ts
git commit -m "style: switch container tokens to full-width fluid with responsive gutters"
```

---

### Task 2: Fix Nested Double-Gutter Padding & Container Alignment in `App.svelte`

**Files:**

- Modify: `src/App.svelte:761-788`, `src/App.svelte:941-943`, `src/App.svelte:1080-1090`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**

- Consumes: Updated `.container` and `.container-wide` from `src/app/theme.css`.
- Produces: Pixel-aligned input panels and diff results without nested double gutters.

- [x] **Step 1: Add alignment and zero-overflow assertions to `tests/e2e/layout.spec.ts`**

Add tests to `tests/e2e/layout.spec.ts`:

- Check that the input panel bounding box left edge aligns with the header inner left edge on desktop (`Math.abs(inputBox.x - headerBox.x) <= 2`).
- Check that there is zero horizontal scrollbar/overflow across 375px, 768px, 1280px, 1440px, and 1920px viewports (`scrollWidth === clientWidth`).

- [x] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/layout.spec.ts --project=chromium`
Expected: FAIL on alignment because `<div class="container">` inside `<main class="container-wide">` has double gutter padding.

- [x] **Step 3: Update `src/App.svelte` container markup and CSS**

1. In `<main id="main" class="container-wide" tabindex="-1">`:
   - Replace `<div class="container">` wrapping the intro, tabs, and `InputPanel` with `<div class="workspace-inputs">`.
   - In `<style>`, define `.workspace-inputs { width: 100%; }`.
2. Replace `<div class="container">` wrapping `.slow-warning` with `<div class="workspace-inputs">`.
3. Ensure `.results-area` maintains `width: 100%;` without extra outer margins.

- [x] **Step 4: Run layout tests to verify they pass**

Run: `npx playwright test tests/e2e/layout.spec.ts --project=chromium`
Expected: PASS

- [x] **Step 5: Commit changes**

```bash
git add src/App.svelte tests/e2e/layout.spec.ts
git commit -m "fix(layout): remove nested container gutter doubling and align workspace inputs"
```

---

### Task 3: Regression Verification & Accessibility Audit

**Files:**

- Modify/Verify: `tests/e2e/shell.spec.ts`, `tests/e2e/a11y.spec.ts`

**Interfaces:**

- Consumes: All updated components and styles.
- Produces: Clean test run across all verification gates.

- [x] **Step 1: Run type checking**

Run: `npm run typecheck`
Expected: 0 errors and 0 warnings

- [x] **Step 2: Run linter and formatter check**

Run: `npm run lint`
Expected: Clean exit code 0

- [x] **Step 3: Run Vitest unit tests**

Run: `npm test`
Expected: 155/155 tests passing

- [x] **Step 4: Run bundle size check**

Run: `npm run build && npm run size`
Expected: Brotlied bundle size $\le 250$ KB

- [x] **Step 5: Run Playwright E2E and axe-core accessibility suite**

Run: `npx playwright test tests/e2e/layout.spec.ts tests/e2e/shell.spec.ts tests/e2e/a11y.spec.ts --project=chromium`
Expected: All tests pass with 0 WCAG 2.1 AA violations

- [x] **Step 6: Commit test updates**

```bash
git add tests/
git commit -m "test(layout): add full-width fluid layout and alignment regression tests"
```
