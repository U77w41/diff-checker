# Fix Text & Scripts Diff Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore full functionality and visual highlighting to the Text & Scripts diff checker for both Side-by-Side and Unified view modes across Word and Character granularities.

**Architecture:** Use `@codemirror/merge`'s `Change` class instances in `TextView.svelte` when passing changes to CodeMirror's diff configuration, wrap view creation in safe error handling, and update CodeMirror theme selectors in `theme.ts` to properly style line and intra-line additions and deletions using our color-blind safe tokens.

**Tech Stack:** Svelte 5 (Runes), CodeMirror 6 (`@codemirror/merge`, `@codemirror/view`, `@codemirror/state`), TypeScript, Vitest, Playwright.

**Spec:** [AGENTS.md](file:///Users/rbih/uc/projects/diff-checker/AGENTS.md) — Pure algorithmic core, client-only computation, WCAG AA compliance, zero backend.

## Global Constraints

- Svelte 5 Runes only (`$state`, `$derived`, `$props`, `$effect`).
- Single quotes, semicolons, no trailing commas, 2-space indentation.
- Pure core isolation: zero browser globals in `src/core/`.
- Bundle budget: $\le 250$ KB initial JS.
- Strict WCAG 2.1 AA accessibility and color-blind safe diff tokens (`--diff-add-bg`, `--diff-del-bg`, `--diff-add-strong`, `--diff-del-strong`).

## Review Focus

1. **Side-by-side mode word-level diff:** Side A displays deleted lines and word spans with `--diff-del-*` tokens; Side B displays added lines and word spans with `--diff-add-*` tokens without errors.
2. **Side-by-side mode char-level diff:** Individual character differences are highlighted with strong intra-line background in both editors.
3. **Unified mode word-level diff:** Deleted chunks display as deleted lines/text with deletion markers; added lines and words display with addition markers.
4. **Unified mode char-level diff:** Deleted and added character-level spans highlight cleanly within the unified editor.
5. **Identical inputs & edge cases:** "No differences found" banner displays properly for identical texts and empty diffs without attempting to create an editor.

---

### Task 1: Fix `Change` instantiation and error handling in `TextView.svelte`

**Files:**

- Modify: `src/ui/text-view/TextView.svelte:1-150`
- Test: `tests/e2e/text-diff.spec.ts`

- [ ] **Step 1: Write an automated test confirming side-by-side and unified diff rendering**
      Create `tests/e2e/text-diff.spec.ts` testing both `side-by-side` and `unified` view modes, verifying:
  - Both editors mount (`.cm-editor` elements exist)
  - Diff decorations (`.cm-changedLine`, `.cm-changedText`) are present in the DOM
  - No page errors (`pageerror`) occur during diff rendering
- [ ] **Step 2: Run the test to confirm failure**
      Run `npx playwright test tests/e2e/text-diff.spec.ts` to verify it reproduces `c.offset is not a function`.
- [ ] **Step 3: Import `Change` from `@codemirror/merge` and map `changes` in `TextView.svelte`**
      Import `Change` from `@codemirror/merge`. Convert `cmChanges` from plain objects to `new Change(ch.fromA, ch.toA, ch.fromB, ch.toB)`.
      Wrap `createView()` in `try/catch` with structured error handling so any unexpected CodeMirror issues fail gracefully without corrupting the app shell.
- [ ] **Step 4: Verify test passes**
      Run `npx playwright test tests/e2e/text-diff.spec.ts` to confirm `TextView` renders successfully without errors.

---

### Task 2: Correct CodeMirror theme tokens for line & intra-line highlights in `theme.ts`

**Files:**

- Modify: `src/ui/text-view/theme.ts:1-49`
- Test: `tests/e2e/text-diff.spec.ts`

- [ ] **Step 1: Update theme selectors to match `@codemirror/merge`'s emitted classes**
      Replace outdated classes (`.cm-changeInsert`, `.cm-changeDelete`, `.cm-insertedGutter`, `.cm-deletedGutter`) with the actual `@codemirror/merge` classes:
  - Side A deleted lines: `&.cm-merge-a .cm-changedLine`, `.cm-deletedChunk`, `.cm-deletedLine` -> `backgroundColor: 'var(--diff-del-bg) !important'`
  - Side A intra-line deleted text: `&.cm-merge-a .cm-changedText`, `.cm-deletedChunk .cm-deletedText`, `.cm-deletedLine .cm-deletedText` -> `backgroundColor: 'var(--diff-del-strong) !important'`
  - Side B added lines: `&.cm-merge-b .cm-changedLine`, `.cm-inlineChangedLine`, `.cm-insertedLine` -> `backgroundColor: 'var(--diff-add-bg) !important'`
  - Side B intra-line added text: `&.cm-merge-b .cm-changedText`, `.cm-insertedLine .cm-changedText` -> `backgroundColor: 'var(--diff-add-strong) !important'`
  - Gutters: `&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter` -> `color: 'var(--diff-del-marker) !important'`
  - Gutters: `&.cm-merge-b .cm-changedLineGutter, .cm-inlineChangedLineGutter` -> `color: 'var(--diff-add-marker) !important'`
- [ ] **Step 2: Add assertions to `tests/e2e/text-diff.spec.ts` for computed styles and highlight classes**
      Verify that `.cm-changedText` and `.cm-changedLine` have the expected background styling applied.
- [ ] **Step 3: Run the test to confirm styles pass**
      Run `npx playwright test tests/e2e/text-diff.spec.ts`.

---

### Task 3: Full suite verification & bundle check

**Files:**

- Test: `tests/unit/`
- Test: `tests/e2e/`
- Check: `npm run typecheck`, `npm run lint`, `npm run size`

- [ ] **Step 1: Run unit tests**
      Execute `npm test` to ensure all 19 test files and 102 tests pass.
- [ ] **Step 2: Run typecheck and linter**
      Execute `npm run typecheck` and `npm run lint`.
- [ ] **Step 3: Run production build and size-limit**
      Execute `npm run build` and `npm run size` to verify bundle size is within budget ($\le 250$ KB initial JS).
- [ ] **Step 4: Clean up temporary debug files**
      Remove `tests/e2e/debug-text-diff.spec.ts`.
