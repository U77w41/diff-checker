# Side-by-side everywhere: design

**Date:** 2026-11-02
**Status:** approved (approach A + section 5), 2026-11-02

## What Ujjwal asked for

1. On a phone, side-by-side can't be opened and there's no control for it. It should be available.
2. The diff should always open in side-by-side by default.
3. Notebooks should get side-by-side too.
4. Adding a single `.ipynb` file in Jupyter Notebooks mode shows "Invalid notebook JSON: Invalid JSON: Unexpected end of JSON input". With both files added it works.

He chose (2026-11-02):

- **Default:** always side-by-side on load, on every device. Don't remember the last choice.
- **Narrow screens:** format like diffchecker.com. Long lines wrap, and each side has line numbers.
- **One notebook added:** wait, and show a hint.
- **Notebook scope:** cell source plus printed output and error tracebacks.

## Findings that shape the design

- `App.svelte` forces `viewMode = 'unified'` when `window.innerWidth < 768`, both on mount and on resize. `Toolbar.svelte` hides `.view-toggle-group` under 768 px. Together they make side-by-side unreachable on phones.
- On mount, `App.svelte` restores `viewMode` from stored settings (`'split' | 'unified'`), so a past unified choice sticks.
- Notebook mode has no `Toolbar`. Its controls live in `NbFilterBar` inside `NotebookView`. Every notebook text diff (code cells, markdown source, stream output, error output) renders `TextDiffResult.hunks` as a single unified column.
- **Upload bug root cause:** `App.svelte` runs a diff as soon as either input has content. In notebook mode, the empty side goes to `diffNotebook`, and its parser calls `JSON.parse('')`, which throws `INVALID_JSON`. Reproduced in a unit probe for both A-empty and B-empty.
- A throwaway spike confirmed that CodeMirror's `MergeView` with `EditorView.lineWrapping` keeps both sides level at 375 px wide. With a wrapped long line, the measured line tops matched pixel for pixel. Text mode needs no new renderer.

## Design

### 1. Default view and mobile access

- `viewMode` starts as `'side-by-side'` on every load and screen size. `App.svelte` stops reading `stored.viewMode`, and both the mount-time and resize-time `innerWidth < 768` overrides are removed.
- Settings still write `viewMode` so old stored data stays valid. It's just never read back. No migration needed.
- `Toolbar.svelte`: `.view-toggle-group` stays visible under 768 px. It sits on the first toolbar row, next to the ⋯ menu button. Word/Character, ignore options and export stay in the ⋯ panel as today.
- The keyboard shortcut that toggles the view keeps working.

### 2. Text mode

- `TextView.svelte` adds `EditorView.lineWrapping` to the side-by-side editors and to the unified editor.
- Under 768 px, code text in the diff drops to 12 px, through a `@media (max-width: 767px)` rule in `TextView.svelte`'s wrapper CSS targeting `.cm-editor`, so each half fits more characters. Desktop size is unchanged.
- Change navigation, collapsing unchanged runs and syntax highlighting are untouched.

### 3. Notebook mode

- **Shared state:** the same `viewMode` from `App.svelte` is passed to `NotebookView`. Changing it in either mode changes it in both, for the session.
- **Toggle:** `NbFilterBar` gets a Side-by-side / Unified button group with the same labels and `aria-pressed` behaviour as the text toolbar. It's visible at every width.
- **New pure function** `pairHunkRows(hunk: Hunk): SplitRow[]` in `src/core/text-diff/split.ts`. It has no DOM access, so it's unit-testable in node.
  - `SplitRow = { left?: DiffLine; right?: DiffLine; kind: 'context' | 'change' }`.
  - Context lines go on both sides of one row.
  - Within a run of consecutive `del` then `add` lines, the i-th `del` pairs with the i-th `add`. Extra lines get an empty opposite cell.
  - Rows keep hunk order.
- **New component** `src/ui/nb-view/SplitHunks.svelte`, with props `{ hunks: Hunk[] }`.
  - Each hunk renders a header row (`@@ -a,b +c,d @@`), then one grid row per `SplitRow`.
  - The grid has four columns: old line number | old text | new line number | new text.
  - Text cells use `white-space: pre-wrap` and `overflow-wrap: anywhere`, so long lines wrap. Grid rows size to the taller side, which keeps both sides level.
  - Removed text gets the existing deletion colours and added text the addition colours. Where a `DiffLine` carries word-level `inline` spans, those words get a stronger tint of the same colour. The unified notebook view doesn't do this today; it stays as is.
  - An empty opposite cell gets the neutral `var(--surface)` background.
- **Where it's used.** When `viewMode === 'side-by-side'`, these swap their unified hunk list for `<SplitHunks>`:
  - `CellCard` code-cell source diff
  - `CellCard` markdown source diff ("Source" mode)
  - `StreamDiff`
  - `ErrorDiff`
- Unified mode keeps today's markup.
- **Out of scope:** `HtmlRenderer`'s "View source diff" panel and the rendered-markdown A/B columns, which are already side by side. Images keep their own side-by-side, swipe and onion modes.

### 4. One notebook added

- In `runDiffNow`, when `currentMode === 'notebook'` and `shouldWaitForSecondNotebook` is true, don't call the worker. Clear `nbDiffResult` and any notebook errors, and set `notebookWaiting = true`.
- While `notebookWaiting` is true, the results area shows a `role="status"` note: **"Add the other notebook to compare."**
- Once both sides have content, the diff runs as normal, so real JSON errors still show.
- Text mode keeps comparing against an empty side.

### 5. Cleaner page and footer (added 2026-11-02)

Ujjwal asked to drop the intro block and make the page and footer cleaner and more minimal, keeping the Support my work page's theme and every footer link.

- **Intro removed.** The logo, the `Diff Checker` heading and the description paragraph go. A visually hidden `<h1>Diff Checker</h1>` (`.sr-only`) stays for screen readers and SEO.
- **Mode switch** becomes a compact segmented control: `Text` | `Notebook`.
  - Each label gets a small inline SVG line icon.
  - The selected segment is filled with `var(--accent)` and shows white text.
  - No emoji, dot or "ACTIVE" badge.
  - It keeps `role="tablist"`/`role="tab"` and `aria-selected`.
  - It's left-aligned at the top of `<main>` and stays on one line at 375 px.
- **Footer**
  - Desktop: one row with `© {year} Ujjwal Chowdhury · Runs entirely in your browser` on the left and `Hire Me · Anurup · Source · Support my work` (with the existing heart icon) on the right.
  - Under 768 px: the two groups stack, centred.
  - The decorative `::before` bar is removed.
  - The link targets, `target`/`rel` attributes and `data-testid="support-link-footer"` don't change.
- **Header** unchanged.

## Testing

- **Unit:** `pairHunkRows`.
  - Context-only hunk.
  - Equal del/add runs pair 1:1.
  - More dels than adds.
  - More adds than dels.
  - Mixed runs separated by context.
  - Line numbers preserved.
- **Unit:** the notebook waiting rule, extracted as a pure helper `shouldWaitForSecondNotebook(mode: 'text' | 'notebook', a: string, b: string): boolean` in `src/core/detect.ts`. It returns true only in notebook mode when exactly one side is empty or whitespace-only.
- **e2e:**
  - A fresh load with a stored `viewMode: 'split'`/`'unified'` still opens side-by-side.
  - On mobile, the view toggle is visible and side-by-side shows two editors.
  - At 375 px, a long changed line wraps, and the matching lines on both sides share the same top position within 1 px.
  - The notebook toggle switches cell diffs between `SplitHunks` and unified.
  - A single notebook shows the hint and no error banner.
  - Adding the second notebook shows the diff.
- **e2e (section 5):**
  - No intro paragraph.
  - A hidden `h1` exists.
  - The mode tabs are named `Text` and `Notebook`, and their labels don't wrap at 375 px.
  - At 1280 px, the footer's Hire Me, Anurup, Source and Support links share one row.
  - axe still passes in light and dark themes.
- **Updated:** `features.spec.ts` "mobile layout hides side-by-side…" becomes "mobile layout shows the view toggle and folded menu". The old assertion contradicts requirement 1.
- **Gate:** lint, typecheck, unit, perf, build, size (≤ 250 KB initial JS), e2e on all projects, axe accessibility checks.

## Risks

- Narrow two-column code is cramped on very small phones (320 px). Wrapping keeps it usable. The toggle lets people switch to unified.
- Shared `viewMode` means notebook and text views always match. That's intended.
