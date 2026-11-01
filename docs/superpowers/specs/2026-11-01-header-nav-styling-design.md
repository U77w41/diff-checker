# Header Navigation Visual Unification & Reordering Design

## Intent

Make the header navigation items visually consistent with uniform 18px icon sizes, matching button geometry, and the label "My Other Tools", while reordering items logically from left to right: `[My Other Tools]` -> `[Hire Me]` -> `[Support my work]`.

## Goals

- Add the text label **"My Other Tools"** to the Tools dropdown toggle button in `src/ui/ToolsDropdown.svelte`.
- Standardize the tools grid icon to 18x18 px (`class="nav-icon"`), matching the icons in `Hire Me` and `Support my work`.
- Unify button styling with `.site-nav a`: `padding: 7px 12px`, `font-size: 15px`, `gap: 8px`, `border-radius: var(--radius-control)`, with a compact 12px animated chevron.
- Responsive mobile behavior ($\le 768$ px): hide the text label and chevron, styling the toggle button as a 40x40 px circular icon button with `border: 1px solid var(--border)` matching `.site-nav a.nav-text-desktop`.
- Reorder `<nav class="site-nav">` in `src/App.svelte` to put `My Other Tools` first, `Hire Me` second, and `Support my work` third.
- Update E2E tests in `tests/e2e/shell.spec.ts` to verify the "My Other Tools" label and navigation order.

## Non-Goals

- Changing the contents inside the dropdown panel.
- Modifying brand title or theme toggle behavior.

## Anti-Goals

- Any visual misalignment, clipped panels on mobile, or broken keyboard focus rings.

## Constraints

- WCAG 2.1 AA touch targets ($\ge 44 \times 44$ px or $40 \times 40$ px with standard nav padding).
- Strict Svelte 5 runes (`$state`).
- Pure CSS with existing design tokens (`--radius-control`, `--border`, `--text-body`, `--card-background-muted`).

## Decisions Made

- Order: `[My Other Tools] -> [Hire Me] -> [Support my work]`
- Text label: "My Other Tools"
- Icon size: 18x18 px across all nav items.
