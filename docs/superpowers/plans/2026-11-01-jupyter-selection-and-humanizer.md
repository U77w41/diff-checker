# Implementation Plan: Jupyter Notebook Selection Clarity, Humanizer Prose Rewrite & License Update

Improve visual clarity of active selections in Jupyter Notebook diffs, humanize all user-facing texts and documentation, and apply the proprietary source-available license.

## 1. Selection Visibility in Jupyter Notebooks

- **File**: `src/app/theme.css`
  - Add missing design tokens: `--surface`, `--bg`, `--text`, `--primary`, `--primary-contrast`, `--radius-sm`, `--font-size-xs`, `--font-size-sm`, `--diff-add-text`, `--diff-del-text`.
- **File**: `src/ui/nb-view/NotebookView.svelte`
  - Track `selectedCellIndex` ($state, defaulting to 0 or first changed cell).
  - Add keyboard shortcut navigation (`j`/`k` or down/up) to step through changed cells.
  - Pass `selectedCellIndex` and `onSelectCell` to `OutlineSidebar` and `CellCard`.
- **File**: `src/ui/nb-view/OutlineSidebar.svelte`
  - Add `.active` styling to the selected item: distinct background, left highlight bar (`border-left: 4px solid var(--focus-ring)`), high contrast, and auto-scroll into view.
- **File**: `src/ui/nb-view/CellCard.svelte`
  - Accept `isSelected` prop and `onSelect` callback.
  - Add `.is-selected` styling: prominent focus ring (`box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3)`), border highlight, and header `<span class="badge badge-selected">Selected</span>`.
  - Fix markdown mode toggle (`Rendered` vs `Source Diff`) active tab styling.
- **File**: `src/ui/nb-view/NbFilterBar.svelte`
  - Convert plain checkboxes into styled toggle pills with explicit on/off state badges so active filters are unmistakable.

## 2. Humanizer Prose Rewrite

- **File**: `README.md`
  - Strip promotional phrasing, forced triads, filler, and AI clichés.
  - State features and capabilities directly and plainly.
- **File**: `src/App.svelte` and modals
  - Review UI microcopy and ensure plain, human phrasing throughout.

## 3. License Replacement

- **File**: `LICENSE`
  - Replace completely with the user's exact custom license notice.
- **File**: `README.md`
  - Update the license section to reference the custom license notice.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- Build and git push with verification on GitHub Actions.
