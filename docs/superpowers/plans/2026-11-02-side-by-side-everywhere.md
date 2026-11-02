# Side-by-side Everywhere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Side-by-side diff by default on every device (text and notebooks), no JSON error with one notebook, and a cleaner page and footer.

**Architecture:** One shared `viewMode` in `App.svelte` drives both modes. Text mode keeps CodeMirror `MergeView`, now with line wrapping. Notebook text diffs get a pure row-pairing function plus a `SplitHunks` grid component. A pure `shouldWaitForSecondNotebook` guard stops single-notebook diffs. The intro block is removed, and the mode tabs and footer are restyled with existing theme tokens.

**Tech Stack:** Svelte 5 runes, TypeScript strict, CodeMirror 6 (`@codemirror/merge`), Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-02-side-by-side-everywhere-design.md`

## Global Constraints

- Svelte 5 runes only; `src/core/` stays pure TypeScript (no DOM, no `window`).
- No new runtime dependencies; initial JS ≤ 250 KB (`npm run size`).
- Use existing theme tokens (`--accent`, `--surface`, `--border`, `--text-muted`, `--card-background`, `--diff-*`); dark mode must work.
- WCAG 2.1 AA: touch targets ≥ 44×44 px, `aria-pressed` on toggle buttons, axe tests stay green.
- Commit metadata uses `Ujjwal Chowdhury <90385123+U77w41@users.noreply.github.com>`; never the RBIH email.
- Exact copy: hint `Add the other notebook to compare.`; tabs `Text` / `Notebook`; footer left `© {year} Ujjwal Chowdhury · Runs entirely in your browser`; footer links `Hire Me`, `Anurup`, `Source`, `Support my work`.
- Every task ends with the full gate green (lint, typecheck, test, test:perf, build, size, e2e on all projects).

## Review Focus

1. **Notebook with stored `similarityThreshold`/options plus `viewMode: 'unified'` in localStorage** must still open side-by-side. Test in Task 1.
2. **Very long unbroken token** (a 300-char URL or base64 line) in a notebook split row must wrap, not overflow the card. Test in Task 3.
3. **Whitespace-only second input** (e.g. a stray newline) in notebook mode should still wait, not error. Test in Task 4.
4. **Switching mode tabs while one notebook is loaded** must not flash the JSON error. Test in Task 4.
5. **Dark theme** for the new segmented control, `SplitHunks` and the footer must pass axe contrast. Test in Task 6.

---

### Task 1: Default side-by-side, mobile toggle, wrapping

**Files:**

- Modify: `src/App.svelte` (mount ~L160-190: drop `stored.viewMode` read and both `innerWidth < 768` overrides)
- Modify: `src/ui/Toolbar.svelte` (`@media (max-width: 768px)`: delete the `.view-toggle-group { display: none }` rule)
- Modify: `src/ui/text-view/TextView.svelte` (add `EditorView.lineWrapping` to the side-by-side base extensions and the unified extensions; `@media (max-width: 767px) { .editor-container :global(.cm-editor) { font-size: 12px; } }`)
- Modify: `README.md` (replace "switching to unified view" in the responsive bullet with "keeping side-by-side with wrapped lines")
- Test: `tests/e2e/view-mode.spec.ts` (create); `tests/e2e/features.spec.ts` (rewrite the mobile test)

**Interfaces:** Produces `viewMode: 'side-by-side' | 'unified'` (unchanged type), now always initialised to `'side-by-side'`.

- [ ] **Step 1: Failing e2e** in `tests/e2e/view-mode.spec.ts`:
  - `opens side-by-side even when unified was stored`: `page.addInitScript` sets `localStorage['diff-checker:settings']` to `{"viewMode":"unified","similarityThreshold":0.6}`, then goto `./#text`, click "Try an example", and expect `.editor-container .cm-editor` to have count 2.
  - `mobile shows the view toggle and two editors` (`test.skip(!isMobile)`): after "Try an example", `.view-toggle-group` is visible, `getByRole('button',{name:'Side-by-side'})` has `aria-pressed="true"`, and the editor count is 2.
  - `long lines wrap and stay aligned at 375px` (`page.setViewportSize({width:375,height:812})`): share link with A = `'x\n# ' + 'word '.repeat(40) + '\nend\n'` and B = the same with `'word'`→`'WORD'` in the middle line. For the `.cm-line` whose text starts with `end` in `.cm-merge-a` and `.cm-merge-b`, `Math.abs(topA - topB) <= 1`, and `.cm-merge-a .cm-content` has no horizontal overflow (`scrollWidth <= clientWidth + 1`).
- [ ] **Step 2:** Rewrite `features.spec.ts` "mobile layout hides side-by-side…" as `mobile layout shows the view toggle and folded menu`: `.view-toggle-group` is visible, the menu toggle is visible, and the panel opens.
- [ ] **Step 3: Run** `npx playwright test tests/e2e/view-mode.spec.ts tests/e2e/features.spec.ts`. Expected: the new tests FAIL (unified forced on mobile, toggle hidden, no wrap).
- [ ] **Step 4: Implement** the file changes listed above.
- [ ] **Step 5: Run** the same command → PASS; then the full gate.
- [ ] **Step 6: Commit** `feat(view): side-by-side by default on every device, with wrapped lines`

---

### Task 2: `pairHunkRows`

**Files:**

- Create: `src/core/text-diff/split.ts`
- Test: `tests/unit/split.test.ts`

**Interfaces:** Produces

```ts
export interface SplitRow {
  kind: 'context' | 'change';
  left?: DiffLine;
  right?: DiffLine;
}
export function pairHunkRows(hunk: Hunk): SplitRow[];
```

- [ ] **Step 1: Failing tests** (`DiffLine`/`Hunk` from `src/core/text-diff/types.ts`). Each test builds the lines with a small `ctx/del/add(no, text)` helper:
  - **context-only:** 2 context lines → 2 rows, `kind:'context'`, and `left === right` content with both numbers set.
  - **equal run:** `del1, del2, add1, add2` → 2 `change` rows pairing `del1|add1`, `del2|add2`.
  - **more dels:** `del1, del2, add1` → rows `del1|add1`, `del2|undefined`.
  - **more adds:** `del1, add1, add2` → rows `del1|add1`, `undefined|add2`.
  - **runs split by context:** `del a, add b, ctx c, add d` → `[a|b (change), c|c (context), undefined|d (change)]`.
  - **line numbers kept:** a row's `left.oldNo` and `right.newNo` equal the source lines' numbers.
- [ ] **Step 2: Run** `npx vitest run tests/unit/split.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement.** Walk the lines and collect consecutive non-context lines into `dels[]`/`adds[]`. On each context line (and at the end), flush `max(dels, adds)` change rows, then push the context row.
- [ ] **Step 4: Run** → PASS; full gate.
- [ ] **Step 5: Commit** `feat(core): pair unified hunk lines into side-by-side rows`

---

### Task 3: Notebook side-by-side (`SplitHunks` + toggle)

**Files:**

- Create: `src/ui/nb-view/SplitHunks.svelte`
- Modify: `src/ui/nb-view/NbFilterBar.svelte` (new props `viewMode`, `onViewModeChange(mode)`; Side-by-side / Unified button group with `aria-pressed`, visible at all widths)
- Modify: `src/ui/nb-view/NotebookView.svelte` (props `viewMode`, `onViewModeChange`; pass to `NbFilterBar` and every `CellCard`)
- Modify: `src/ui/nb-view/CellCard.svelte` (prop `viewMode`; markdown-source and code-source hunk blocks render `<SplitHunks hunks={cellDiff.source.hunks} />` when `'side-by-side'`; pass `viewMode` to `StreamDiff`/`ErrorDiff`)
- Modify: `src/ui/nb-view/renderers/StreamDiff.svelte`, `ErrorDiff.svelte` (prop `viewMode`; `<SplitHunks hunks={diff.hunks} />` when side-by-side)
- Modify: `src/App.svelte` (`<NotebookView viewMode={viewMode} onViewModeChange={(m) => (viewMode = m)} …>`)
- Test: `tests/e2e/notebook-view.spec.ts` (create)

**Interfaces:**

- Consumes: `pairHunkRows` (Task 2), `viewMode` (Task 1).
- Produces: `SplitHunks` props `{ hunks: Hunk[] }`.
  - Markup: `.split-hunks` > per hunk `.split-hunk-hdr` + rows `.split-row` with cells `.split-no.left`, `.split-text.left`, `.split-no.right`, `.split-text.right`.
  - Class modifiers: `is-del`/`is-add`/`is-empty`.
  - `inline` spans render as `<mark class="split-word">`.

- [ ] **Step 1: Failing e2e** `notebook-view.spec.ts`, using a share link of two notebooks where cell `c1` source changes from `print("a")\nx = 1` to `print("b")\nx = 1`:
  - `notebook diffs default to side-by-side`: `.split-hunks` is visible, the first `.split-text.left.is-del` contains `print("a")`, and the matching `.split-text.right.is-add` contains `print("b")`.
  - `toggle switches notebook diffs to unified`: click `getByRole('button',{name:'Unified'})` inside the notebook filter bar → `.split-hunks` has count 0, `.code-line.line-del` is visible, and switching to the Text tab shows the Unified button `aria-pressed="true"` (shared state).
  - `long unbroken token wraps inside the cell` (Review Focus 2): source line `'u=' + 'A'.repeat(300)`; the `.split-hunks` element's `scrollWidth <= clientWidth + 1` at a 375 px viewport.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/notebook-view.spec.ts` → FAIL.
- [ ] **Step 3: Implement.**
  - **Grid:** `grid-template-columns: auto 1fr auto 1fr`.
  - **Text cells:** `white-space: pre-wrap; overflow-wrap: anywhere; min-width: 0`.
  - **Colours:** `is-del` uses the existing deletion background token, `is-add` the addition token, `is-empty` uses `var(--surface)`.
  - **Line numbers:** `var(--text-muted)`, `user-select: none`.
  - **Font:** the same monospace font and size as the existing `.code-line`.
- [ ] **Step 4: Run** → PASS; full gate (axe included).
- [ ] **Step 5: Commit** `feat(notebook): side-by-side cell diffs with a shared view toggle`

---

### Task 4: Wait for the second notebook

**Files:**

- Modify: `src/core/detect.ts`
- Modify: `src/App.svelte` (`runDiffNow` early-return; `notebookWaiting` state; status note in the results area)
- Test: `tests/unit/detect.test.ts`, `tests/e2e/notebook-view.spec.ts`

**Interfaces:** Produces `export function shouldWaitForSecondNotebook(mode: 'text' | 'notebook', a: string, b: string): boolean`. It's true only when `mode === 'notebook'` and exactly one of `a.trim()`, `b.trim()` is empty.

- [ ] **Step 1: Failing unit tests:**
  - `('notebook', nb, '')` → true
  - `('notebook', '', nb)` → true
  - `('notebook', nb, '\n  ')` → true
  - `('notebook', nb, nb)` → false
  - `('notebook', '', '')` → false
  - `('text', 'x', '')` → false
- [ ] **Step 2: Failing e2e** in `notebook-view.spec.ts`:
  - `one notebook shows a hint, not an error`: `#notebook`, set `#input-a` to the example notebook JSON (fetched with `page.request` from `./examples/original.ipynb`) → `getByRole('status')` contains `Add the other notebook to compare.`, and `getByText(/Invalid notebook JSON/)` has count 0.
  - Then filling `#input-b` with `modified.ipynb` shows `.cell-card`.
  - `switching tabs with one notebook loaded never shows the JSON error` (Review Focus 4): with A filled, click the Text tab then the Notebook tab → no `Invalid notebook JSON` text at any point (check after each click).
- [ ] **Step 3: Run** both → FAIL.
- [ ] **Step 4: Implement.** At the top of the try block in `runDiffNow`, if `shouldWaitForSecondNotebook(currentMode, textA, textB)`: set `nbDiffResult = null`, `diffResult = null`, clear `notebookJsonError`/`notebookFormatError`/`diffErrorMessage`, set `notebookWaiting = true`, and return. Otherwise set `notebookWaiting = false`. Render `<p class="status-banner info" role="status">Add the other notebook to compare.</p>` where results appear when `notebookWaiting`.
- [ ] **Step 5: Run** → PASS; full gate.
- [ ] **Step 6: Commit** `fix(notebook): wait for both notebooks instead of parsing an empty side`

---

### Task 5: Remove the intro, compact mode switch

**Files:**

- Modify: `src/App.svelte` (`<section class="intro">`: drop the logo, visible `h1` and paragraph; add `<h1 class="sr-only">Diff Checker</h1>`; tabs become `Text` / `Notebook` with 16 px inline SVG icons, no emoji/dot/badge)
- Modify: `src/app/theme.css` (remove the `.intro h1`/`.intro p` rules; add `.sr-only` if missing; segmented-control styles: container `display:inline-flex; border:1px solid var(--border); border-radius:999px; padding:3px`, tabs `min-height:44px; padding:0 16px; white-space:nowrap`, selected `background:var(--accent); color:#fff`)
- Modify: `tests/e2e/features.spec.ts` (tab names `/^Notebook$/`, `/^Text$/`)
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:** Tabs keep `role="tab"`, `aria-selected`, and their click handlers.

- [ ] **Step 1: Failing e2e** in `shell.spec.ts`:
  - `no intro block, hidden h1 kept`: `getByText('Compare text files, source code')` has count 0, and `locator('h1')` has text `Diff Checker` and is not visible (the bounding box width ≤ 1).
  - `mode tabs are compact and stay on one line at 375px`: `getByRole('tab',{name:'Text',exact:true})` and `'Notebook'` exist, and at 375 px each tab's `getBoundingClientRect().height <= 48`.
- [ ] **Step 2: Run** → FAIL. Update the `features.spec.ts` tab names in the same step; that test now FAILS until Step 3.
- [ ] **Step 3: Implement** the file changes listed above.
- [ ] **Step 4: Run** `npx playwright test tests/e2e/shell.spec.ts tests/e2e/features.spec.ts` → PASS; full gate.
- [ ] **Step 5: Commit** `feat(ui): drop the intro block and use a compact mode switch`

---

### Task 6: Minimal footer

**Files:**

- Modify: `src/App.svelte` (footer markup)
- Modify: `src/app/theme.css` (footer rules; remove `.site-footer .container::before`)
- Test: `tests/e2e/shell.spec.ts`, `tests/e2e/a11y.spec.ts`

**Interfaces:**

- Footer markup: `.footer-row` > `.footer-meta` (copyright + `·` + privacy) and `nav.footer-nav` (Hire Me, Anurup, Source, Support my work).
- The support link keeps `data-testid="support-link-footer"`, `target="_blank"`, `rel="noreferrer"` and its icon. The Source link keeps `target="_blank" rel="noreferrer"`.

- [ ] **Step 1: Failing e2e:**
  - `footer is one row on desktop` (1280×900; skip on mobile): the footer links `Hire Me`, `Anurup`, `Source`, `Support my work` exist with hrefs `https://u77w41.github.io/resume/`, `https://u77w41.github.io/anurup/`, `https://github.com/U77w41/diff-checker`, `https://u77w41.github.io/support-my-work/`. All four boxes' `top` values are within 4 px of each other. The footer contains `Runs entirely in your browser`.
  - `footer stacks centred on mobile` (`!isMobile` skip): `.footer-meta` and `.footer-nav` both have `text-align`/`justify-content` centred, and the nav's top is greater than the meta's bottom.
  - In `a11y.spec.ts`, add `active notebook diff passes axe in dark theme` (Review Focus 5): set the `StackColorScheme=dark` init script, go to the Task 3 notebook share link, run `AxeBuilder` with `wcag2a`/`wcag2aa`, and expect no violations.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - **Layout:** `.footer-row { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; font-size:var(--font-size-sm); color:var(--text-muted) }`.
  - **Separators:** links separated with `gap`, not text bullets.
  - **Mobile:** `@media (max-width:767px)` sets `flex-direction:column; text-align:center`.
- [ ] **Step 4: Run** → PASS; full gate.
- [ ] **Step 5: Commit** `feat(ui): minimal one-row footer`
