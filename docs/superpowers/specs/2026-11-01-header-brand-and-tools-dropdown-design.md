# Header Brand & Tools Dropdown Redesign

## Intent
Replace the personal identity in the site header with project branding for Diff Checker, and replace the direct Anurup nav link with a Tools dropdown matching the layout and behavior from `u77w41.github.io`.

## Goals
- Replace the header avatar, personal name ("Ujjwal Chowdhury"), and tagline with the Diff Checker logo and "Diff Checker" title linking to `./`.
- Replace the direct "Anurup" link in the top navigation with a "Tools" dropdown button featuring the 4-circle tools grid icon and an animated chevron.
- Inside the dropdown panel, render the Anurup item with its icon, title ("ANURUP"), description ("Privacy-first photo & PDF tools for online forms"), and external link icon pointing to `https://u77w41.github.io/anurup/`.
- Provide accessible dropdown interactions: toggle on click, close on click outside, close on `Escape` key with focus returned to the toggle button, and proper ARIA states (`aria-expanded`, `aria-controls`, `aria-haspopup="true"`).
- Update E2E tests in `tests/e2e/shell.spec.ts` to assert against the new brand and dropdown elements.

## Non-Goals
- Changing footer copyright or author metadata.
- Modifying "Support my work" or "Hire Me" navigation links.
- Adding additional tools to the dropdown beyond Anurup right now.

## Anti-Goals
- Disrupting light/dark theme synchronization or mobile header responsiveness.
- Introducing external network requests or breaking bundle size limits.

## Constraints
- Svelte 5 runes only (`$state`, `$effect`).
- Strict WCAG 2.1 AA keyboard navigation and touch target sizing.
- Pure client-side operation with inline SVGs styled via `currentColor`.

## Approaches Considered
- **Approach A (Selected):** Modular `src/ui/ToolsDropdown.svelte` component. Encapsulates open/close state, click-outside listener, and Escape key handling cleanly.
- **Approach B (Rejected):** Inline markup and state inside `src/App.svelte`. Rejected to prevent further bloating `App.svelte` and mixing menu lifecycle logic with diff state.

## Decisions Made
- Brand link points to `./` (diff checker app home).
- Clean title only ("Diff Checker"), with no secondary tagline.
- Dropdown panel visually mirrors Hugo Stack design tokens (`--card-background`, `--card-separator-color`, `--shadow-l2`).

## Builder Details
- Dropdown panel is positioned absolute below the toggle button with `z-index: 50` so it floats cleanly above CodeMirror editors and toolbars.
- Svelte 5 `$state` manages `isOpen`. Dropdown auto-closes on navigation clicks and window clicks outside the component container.
