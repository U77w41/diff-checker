# Header Navigation Visual Unification & Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize header navigation with uniform 18px icon sizes, add the text label "My Other Tools" to the dropdown toggle button, and reorder navigation items to `[My Other Tools] -> [Hire Me] -> [Support my work]`.

**Architecture:** Update `ToolsDropdown.svelte` toggle button markup and styles to mirror `.site-nav a` on desktop and mobile. Reorder navigation elements in `App.svelte` and assert the new label and ordering in `tests/e2e/shell.spec.ts`.

**Tech Stack:** Svelte 5, CSS, Playwright.

**Spec:** [`docs/superpowers/specs/2026-11-01-header-nav-styling-design.md`](file:///data/data/com.termux/files/home/diff-checker/docs/superpowers/specs/2026-11-01-header-nav-styling-design.md)

## Global Constraints

- Svelte 5 runes only.
- Strict touch target sizing ($\ge 44 \times 44$ px or $40 \times 40$ px with standard padding).
- Zero external network assets.
- Initial JS bundle size budget remains under 250 KB (`npm run size`).

## Review Focus

1. **Visual uniformity:** The "My Other Tools" toggle button must match `Hire Me` and `Support my work` in typography (15px), gap (8px), padding (7px 12px), and icon size (18x18 px).
2. **Mobile responsive collapse:** On viewports $\le 768$ px, the label and chevron must hide, rendering a 40x40 px circular button matching `Hire Me`.
3. **Dropdown panel positioning:** On mobile, the panel remains aligned with `left: var(--gutter, 16px)` and fits within the viewport.
4. **Keyboard accessibility:** The toggle button remains accessible via `Tab` with visible focus indicators.
5. **Nav order verification:** The rendered DOM order must be `ToolsDropdown` followed by `Hire Me`, followed by `Support my work`.

---

### Task 1: Update `ToolsDropdown.svelte` Toggle Markup & Styling

**Files:**

- Modify: `src/ui/ToolsDropdown.svelte`

**Interfaces:**

- Produces: Updated `<ToolsDropdown />` component with `My Other Tools` label and 18px icon.
- Desktop layout: `<button class="menu-social-dropdown-toggle"> <svg class="nav-icon">...</svg> <span class="nav-label">My Other Tools</span> <span class="menu-social-dropdown-chevron">...</span> </button>`
- Mobile layout: hides `.nav-label` and chevron, displays 40x40 px circular button.

- [ ] **Step 1: Update `src/ui/ToolsDropdown.svelte`**

1. Change tools grid `<svg>` attributes to `class="nav-icon" width="18" height="18"`.
2. Add `<span class="nav-label">My Other Tools</span>` inside the button.
3. Change chevron `<svg>` dimensions to `width="12" height="12"`.
4. Update CSS:
   - Match `.site-nav a`: `display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; font-size: 15px; font-family: inherit; font-weight: 400; border-radius: var(--radius-control); color: var(--text-body); background: transparent;`.
   - On `@media (max-width: 768px)`:
     - `.menu-social-dropdown-toggle .nav-label { display: none; }`
     - `.menu-social-dropdown-toggle .menu-social-dropdown-chevron { display: none; }`
     - `.menu-social-dropdown-toggle { width: 40px; height: 40px; padding: 0; justify-content: center; border-radius: 50%; border: 1px solid var(--border); }`
     - `.menu-social-dropdown-toggle:hover { border-color: var(--border-strong); }`

- [ ] **Step 2: Verify typecheck & lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/ToolsDropdown.svelte
git commit -m "feat(ui): standardize tools dropdown icon size, styling, and label"
```

---

### Task 2: Reorder Navigation Items in `App.svelte`

**Files:**

- Modify: `src/App.svelte`

**Interfaces:**

- Consumes: `ToolsDropdown` from `./ui/ToolsDropdown.svelte`
- Updates: `<nav class="site-nav">` `<ul>` item order:

  1. `<li><ToolsDropdown /></li>`
  2. `<li><a ...>Hire Me</a></li>`
  3. `<li>...Support my work...</li>`

- [ ] **Step 1: Reorder `<li>` items in `src/App.svelte`**

Place `<li><ToolsDropdown /></li>` before `<li><a ... href="https://u77w41.github.io/resume/" ...>Hire Me</a></li>`.

- [ ] **Step 2: Verify typecheck & unit tests**

Run: `npm run typecheck && npm test`
Expected: 0 errors, 102 passed.

- [ ] **Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat(ui): reorder header navigation to place My Other Tools first"
```

---

### Task 3: Update E2E Tests & Final Verification

**Files:**

- Modify: `tests/e2e/shell.spec.ts`

**Interfaces:**

- Asserts toggle button has text `'My Other Tools'`
- Asserts navigation items appear in order: `ToolsDropdown`, `Hire Me`, `Support my work`

- [ ] **Step 1: Update `tests/e2e/shell.spec.ts`**

1. In `tools dropdown opens, displays anurup...`:
   - Assert `await expect(toggle).toContainText('My Other Tools');`
2. Add test asserting nav item order:
   - Check `page.locator('nav.site-nav ul > li')` has Tools dropdown first and Hire Me second.

- [ ] **Step 2: Run verification chain**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run size
```

Expected: All suites pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/shell.spec.ts
git commit -m "test(e2e): update shell tests for My Other Tools label and nav order"
```
