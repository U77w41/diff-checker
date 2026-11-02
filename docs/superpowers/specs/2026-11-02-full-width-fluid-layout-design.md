# Full-Width Fluid Desktop Layout Design

## Intent

Transition Diff Checker from a narrow, constrained box layout (`--container: 960px`, `--container-wide: 1440px`) to a modern, edge-to-edge full-width fluid layout with responsive side padding matching [Anurup](https://u77w41.github.io/anurup/), eliminating excessive blank margins on desktop monitors and providing maximum screen space for side-by-side text and notebook diffing.

## Current State & Deficiencies

1. **Header & Footer:** Constrained to `max-width: var(--container)` (`960px`). On standard 1080p (1920px) monitors, 480px on each side is completely wasted.
2. **Inputs & Controls:** Mode tabs, status banners, and `InputPanel` are nested in a `<div class="container">` (960px). The dual input textareas A and B are squeezed into less than 450px each on desktop.
3. **Diff Results Area:** Capped at `var(--container-wide)` (`1440px`). This causes an awkward layout width jump between the 960px inputs and the 1440px results, while still leaving 240px of blank space on each side on 1080p (and 560px on 1440p displays).
4. **Double Padding Bug:** `<div class="container">` was nested inside `<main class="container-wide">`, causing the intro and inputs to have double gutter padding compared to the diff results area.

## Goals

- Implement a full-width fluid layout where header, main content (inputs + diff results), and footer use 100% of available browser width.
- Implement responsive horizontal side padding (`--gutter`):
  - Mobile ($\le 768$px): `16px`
  - Tablet / Small Laptop ($> 768$px): `24px`
  - Desktop ($> 1200$px): `32px`
- Unify container alignment: Ensure header items, tabs, input panels, diff toolbars, CodeMirror/notebook diffs, and footer align pixel-to-pixel along the left and right margins.
- Ensure side-by-side text diffing and dual input panels expand smoothly across large screens (1440p, 1080p, 4K) without artificial width caps.
- Retain zero horizontal scroll overflow on all viewports from 320px up to 4K displays.

## Non-Goals

- Changing toolbar button functionality, shortcuts, or color tokens.
- Altering the Hugo "Stack" typography, avatar, or link styles.

## Constraints

- Zero backend, client-side only.
- Strict CSP compliance (`script-src 'self'`).
- Bundle size must remain well within $\le 250$ KB.
- WCAG 2.1 AA accessibility must be maintained (no truncated touch targets, readable contrast).
- Svelte 5 runes and clean CSS tokens.

## Architecture & Layout Plan

### 1. Token Updates in `src/app/theme.css`

Update container and gutter design tokens:

```css
:root {
  --gutter: 16px;
  --container: 100%;
  --container-wide: 100%;
}

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

Update `.container` and `.container-wide` rules:

```css
.container,
.container-wide {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0 var(--gutter);
}
```

### 2. Markup Clean-Up in `src/App.svelte`

- Fix the double-padding nesting: Replace the inner `<div class="container">` inside `<main id="main" class="container-wide">` with a `<div class="workspace-inputs">` (or styled wrapper) that uses `width: 100%` and inherits the main container's padding without adding an extra nested `padding: 0 var(--gutter)`.
- Ensure `.header-inner`, `#main`, and `.footer-row` all use the identical fluid width and `--gutter` padding, so the page has clean, unified margins from top to bottom.

### 3. Verification & Testing

- Add E2E tests in `tests/e2e/shell.spec.ts` (or a dedicated layout spec):
  - Verify that at 1920px viewport, the header, input panel grid, and results area utilize $> 1800$px (viewport width minus responsive gutters).
  - Verify that no horizontal scrollbar/overflow exists (`scrollWidth === clientWidth`) across 375px, 768px, 1280px, 1440px, and 1920px viewports.
- Run typecheck, lint, full unit tests, and Playwright tests.
