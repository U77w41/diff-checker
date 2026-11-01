# Header Brand & Tools Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace personal branding in the site header with the Diff Checker project identity (logo + name linking to `./`) and replace the standalone Anurup link with an accessible Tools dropdown containing the Anurup project.

**Architecture:** Create an encapsulated Svelte 5 `ToolsDropdown.svelte` component managing open/close state, ARIA attributes, and outside-click/Escape dismissal. Integrate this component into `App.svelte`'s `<header>` navigation and replace the brand header markup.

**Tech Stack:** Svelte 5 (runes `$state`), TypeScript, Playwright E2E, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-01-header-brand-and-tools-dropdown-design.md`](file:///data/data/com.termux/files/home/diff-checker/docs/superpowers/specs/2026-11-01-header-brand-and-tools-dropdown-design.md)

## Global Constraints

- Svelte 5 runes only (`$state`, `$effect`).
- Touch targets must be at least 44x44 px (WCAG 2.1 AA).
- All icons and styles must render offline with zero external network requests.
- Initial JS bundle budget must remain under 250 KB (`npm run size`).

## Review Focus

1. **Escape key dismissal:** Pressing `Escape` when the Tools dropdown is open must close the dropdown and return focus to the toggle button.
2. **Outside-click dismissal:** Clicking outside the dropdown container when open must close the panel without triggering unintended actions.
3. **Keyboard navigation:** The toggle button and Anurup link must be reachable via `Tab` with visible focus indicators.
4. **Theme adaptation:** All icons and text within the brand and Tools dropdown must cleanly adapt between light and dark themes without hardcoded hex colors.
5. **Mobile layout:** On viewport width $\le 768$ px, the header must remain cleanly laid out without overflowing horizontally.

---

### Task 1: Create `ToolsDropdown.svelte` Component

**Files:**

- Create: `src/ui/ToolsDropdown.svelte`

**Interfaces:**

- Produces: `default` Svelte component `<ToolsDropdown />`
- State: `isOpen: boolean` via `$state(false)`
- Interactions:

  - Toggle button: `aria-expanded={isOpen}`, `aria-controls="menu-social-dropdown-tools"`
  - Panel: `id="menu-social-dropdown-tools"`, `hidden={!isOpen}`
  - Link: `href="https://u77w41.github.io/anurup/"`, `target="_blank"`, `rel="noopener"`

- [ ] **Step 1: Write `src/ui/ToolsDropdown.svelte`**

Implement the Svelte 5 component with:

1. `let isOpen = $state(false);`
2. Outside-click listener via window event listener when open.
3. Keydown listener on toggle and panel for `Escape` closing with focus return.
4. 4-dots grid icon SVG and animated chevron SVG on the toggle button.
5. Dropdown panel with title "Tools", Anurup icon, name "ANURUP", subtitle "Privacy-first photo & PDF tools for online forms", and external link icon.
6. Scoped styles mirroring Stack theme tokens (`--card-background`, `--border`, `--text`, `--text-muted`, `--surface`).

- [ ] **Step 2: Typecheck Svelte runes**

Run: `npm run typecheck`
Expected: `svelte-check found 0 errors and 0 warnings`

- [ ] **Step 3: Commit**

```bash
git add src/ui/ToolsDropdown.svelte
git commit -m "feat(ui): add ToolsDropdown component"
```

---

### Task 2: Integrate `ToolsDropdown` and Update Brand in `App.svelte` & `theme.css`

**Files:**

- Modify: `src/App.svelte`
- Modify: `src/app/theme.css`

**Interfaces:**

- Consumes: `ToolsDropdown` from `./ui/ToolsDropdown.svelte`
- Updates:

  - Brand link `<a class="brand" href="./" aria-label="Diff Checker home">`
  - Inline Diff Checker SVG logo styled with `currentColor`
  - `<span class="brand-name">Diff Checker</span>` (removed avatar and tagline)
  - Replace `<li><a ... href="https://u77w41.github.io/anurup/">...</a></li>` with `<li><ToolsDropdown /></li>`

- [ ] **Step 1: Update `src/app/theme.css` for brand styling**

Adjust `.brand` styles:

- Replace or augment `.brand-avatar` with `.brand-icon` (36x36 px, flex-shrink 0, `color: var(--accent)`).
- Ensure `.brand-name` has appropriate size (18px, font-weight 700) and aligns cleanly with `.brand-icon`.

- [ ] **Step 2: Update `src/App.svelte` markup**

1. Import `ToolsDropdown` from `./ui/ToolsDropdown.svelte`.
2. Replace the `.brand` anchor in `<header class="site-header">` with:
   ```svelte
   <a class="brand" href="./" aria-label="Diff Checker home">
     <svg
       class="brand-icon"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       stroke-width="1.5"
       stroke-linecap="round"
       aria-hidden="true"
     >
       <path
         d="M12 3L12 21M14.7107 19.3887C17.1796 18.8321 19.1072 16.979 19.6863 14.6058C20.1046 12.8918 20.1046 11.1081 19.6863 9.39419C19.1072 7.02094 17.1796 5.16789 14.7107 4.61121M12 4.30969C11.0904 4.30969 10.1808 4.41019 9.28927 4.61121C6.82045 5.16789 4.89278 7.02094 4.31367 9.39419C3.89544 11.1081 3.89544 12.8918 4.31367 14.6058C4.89278 16.979 6.82045 18.8321 9.28928 19.3887C10.1808 19.5898 11.0904 19.6903 12 19.6903"
       />
     </svg>
     <span class="brand-text">
       <span class="brand-name">Diff Checker</span>
     </span>
   </a>
   ```
3. In `<nav class="site-nav">`, replace the Anurup `<li>` with `<li><ToolsDropdown /></li>`.

- [ ] **Step 3: Run typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: All checks pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte src/app/theme.css
git commit -m "feat(ui): update header brand to Diff Checker and add Tools dropdown"
```

---

### Task 3: Update E2E Tests & Final Verification

**Files:**

- Modify: `tests/e2e/shell.spec.ts`

**Interfaces:**

- Validates brand link: `href="./"`, text `'Diff Checker'`
- Validates Tools dropdown: toggle, expand, outside click, and Escape dismiss

- [ ] **Step 1: Update and expand `tests/e2e/shell.spec.ts`**

Update `renders page title and header brand`:

```typescript
const brand = page.locator('header a.brand');
await expect(brand).toHaveAttribute('href', './');
await expect(brand.locator('.brand-name')).toHaveText('Diff Checker');
```

Add tests for Tools dropdown:

```typescript
test('tools dropdown opens, displays anurup, and closes on escape and outside click', async ({
  page
}) => {
  await page.goto('./');

  const toggle = page.locator('button.menu-social-dropdown-toggle');
  await expect(toggle).toBeVisible();
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
```

- [ ] **Step 2: Run verification chain**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run size
npm run test:e2e
```

Expected: All suites pass without errors.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/shell.spec.ts
git commit -m "test(e2e): update shell spec for brand and tools dropdown"
```
