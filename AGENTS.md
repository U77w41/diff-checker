# AGENTS.md — Developer & AI Agent Guide

Comprehensive, high-signal guide for AI agents and human contributors working on the **Diff Checker** codebase.

---

## 1. Project Overview & Philosophy

**Diff Checker** is a high-performance, browser-only diff tool for text, scripts, and Jupyter notebooks (`.ipynb`), hosted as a static site on GitHub Pages.

- **URL:** `https://u77w41.github.io/diff-checker/` (Base path: `/diff-checker/`)
- **Stack:** Vite 8 + Svelte 5 (Runes) + TypeScript (strict) + CodeMirror 6 + Comlink Web Worker.
- **Client-Side Privacy:** Strict zero-backend constraint. No telemetry, cookies, or remote data leakage. Inputs never leave the user's browser.
- **Budget:** Strict $\le 250\text{ KB}$ initial JS bundle budget (enforced by `size-limit`).
- **Brand Identity:** Matches the Hugo "Stack" theme from [Support my work](https://u77w41.github.io/support-my-work/) with self-hosted Lato font and colour-blind safe diff tokens.

---

## 2. Repository Layout

```text
diff-checker/
├── .github/
│   ├── ISSUE_TEMPLATE/     # Bug report and feature request templates
│   └── workflows/          # ci.yml (all PRs/main), deploy.yml (GitHub Pages)
├── public/                 # Static assets (favicons, theme-init.js, bundled examples)
├── src/
│   ├── app/                # Application state, theme tokens (theme.css), settings persistence
│   ├── core/               # Pure algorithmic core (Zero DOM/browser dependencies)
│   │   ├── nb-align/       # 4-pass notebook cell alignment & token Dice similarity
│   │   ├── nb-diff/        # Source, output (stream/error/images), and metadata diffs
│   │   ├── nb-parse/       # nbformat 4.x parser & normalisation
│   │   ├── text-diff/      # jsdiff-powered line/word/char diffing & normalisation
│   │   ├── detect.ts       # Input mode detection (.ipynb JSON vs text)
│   │   ├── errors.ts       # DiffError class with spec codes
│   │   ├── file-reader.ts  # Binary checking (first 8 KB) & UTF-8 fallback
│   │   ├── hash.ts         # Fast FNV-1a non-cryptographic hashing
│   │   ├── patch.ts        # Git apply-compatible unified patch generator
│   │   ├── remote.ts       # CORS-safe URL loader with standard error messaging
│   │   └── share.ts        # LZ-string #s= URL compressor & JSON bundle generator
│   ├── ui/                 # Svelte 5 UI components
│   │   ├── nb-view/        # CellCard, OutlineSidebar, NbFilterBar, and renderers/
│   │   │   └── renderers/  # ImageDiff (3-way), HtmlRenderer (iframe), markdown (DOMPurify+KaTeX)
│   │   ├── text-view/      # CodeMirror 6 merge view, language extensions, custom theme
│   │   ├── HelpModal.svelte# Keyboard shortcuts cheatsheet dialog (?)
│   │   ├── InputPanel.svelte # Dual input panels (A/B), dropzones, URL loader
│   │   ├── ShareModal.svelte # Share link generator (8 KB limit check) & bundle export
│   │   └── Toolbar.svelte  # Controls, chunk navigation, mobile menu
│   ├── worker/             # Web Worker offloading via Comlink
│   │   ├── diff.worker.ts  # Worker thread entrypoint
│   │   └── worker-client.ts# WorkerManager singleton (10s timeout, fallback, respawn)
│   ├── App.svelte          # Root app shell, hash router, global shortcuts, <svelte:boundary>
│   └── main.ts             # Application entrypoint & Lato font imports
└── tests/
    ├── e2e/                # Playwright end-to-end tests (shell, features, axe-core a11y)
    ├── fixtures/notebooks/ # 6 golden notebook pairs for regression verification
    ├── perf/               # 10k-line text & 500-cell notebook performance benchmarks
    └── unit/               # Vitest unit & fast-check property tests
```

---

## 3. Essential Commands

Always verify changes with the project verification chain:

```bash
# Install exact dependencies
npm ci

# Start local dev server
npm run dev

# Run all unit, property, and fixture tests
npm test

# Run performance benchmarks (< 1000 ms targets)
npm run test:perf

# Typecheck (Svelte 5 runes & TS 6)
npm run typecheck

# Lint and check formatting
npm run lint

# Auto-format codebase
npm run format

# Production build (PWA & worker bundling)
npm run build

# Verify bundle budget (≤ 250 KB initial JS)
npm run size

# Run Playwright E2E & axe-core accessibility tests
npm run test:e2e
```

---

## 4. Key Architectural Patterns & Invariants

### A. Pure Core Isolation (`src/core/`)

- All business logic under `src/core/` **must remain pure TypeScript** without browser-specific globals (`window`, `document`, DOM elements).
- Runs in Vitest's `node` environment to guarantee portability to Web Workers.
- Enforce strict TDD when adding or changing algorithms in `src/core/`.

### B. Notebook Alignment Engine (`src/core/nb-align/`)

The cell alignment follows an immutable 4-pass pipeline:

1. **Pass 1 — Unique ID Anchors:** Matches identical cell IDs present exactly once on each side using Longest Increasing Subsequence (LIS) to maintain relative order.
2. **Pass 2 — Exact Content LCS:** Identical cells (type + source + outputs) matched via LCS.
3. **Pass 3 — Greedy Token Dice Similarity:** Matches modified cells with similarity $\ge 0.5$ using bigram token Dice score within a 10,000-cell window.
4. **Pass 4 — Move Detection & Leftovers:** Cells with matching content in non-monotonic positions marked `moved`. Unmatched cells classified as `added` or `deleted`.

- Output sequence is strictly B-ordered; deleted cells are inserted immediately after their partner's predecessor in A.

### C. Bundle Budget & Code Splitting

- Never import heavy libraries (e.g. `katex`, `jsdom`, language grammars) in the main entry graph.
- **KaTeX:** Lazily imported via `await import('katex')` only when math expressions (`$$...$$` or `$...$`) are detected in markdown cells.
- **Syntax Highlighting:** Languages in `src/ui/text-view/languages.ts` are loaded on-demand via dynamic imports.
- Initial JS bundle size is checked by `.size-limit.json` on `dist/assets/index-*.js`.

### D. Security & Sanitization

- **Zero raw `innerHTML`:** All markdown and HTML rendering must pass through `DOMPurify.sanitize()`.
- **HTML Outputs:** Displayed exclusively inside sandboxed `<iframe>` elements (`sandbox=""`, no `allow-scripts`, no `allow-same-origin`) using `srcdoc`.
- **No Remote Assets in Notebooks:** Image attachments must resolve to `data:` URLs from internal notebook cell attachments; never load unvetted remote images.
- **Strict CSP:** Configured in `index.html` meta tag (`script-src 'self'`). No inline scripts.

### E. Error Handling Matrix

- **Binary Files:** Reject with code `BINARY` if a null byte (`0x00`) exists in the first 8 KB.
- **Invalid UTF-8:** Decode with fallback replacement characters (`\uFFFD`) and display warning.
- **Invalid JSON / Lower nbformat:** Offer explicit _"Compare as plain text instead"_ fallback button.
- **Worker Hang / Crash:** 10-second slow diff alert with Cancel button; automatically retries diffs under 1 MB on main thread.
- **UI Boundary:** All major UI views wrapped in `<svelte:boundary>` with reload and issue reporting options.

### F. Sharing & Persistence

- **URL Hash:** `#s=<compressed_data>` compressed with `lz-string`.
- **8 KB Limit:** If compressed payload $> 8,192$ bytes, URL generation is disabled, offering offline `.json` diff bundles instead.
- **Privacy Notice:** Always display _"Anyone with this link can read both inputs"_ before sharing.
- **LocalStorage:** Stored under key `diff-checker:settings`. Inputs are **never saved by default** (opt-in only). All storage operations must be wrapped in `try/catch`.

---

## 5. Agent Instructions for Modifications

1. **Before Modifying:** Run `npm run typecheck && npm test` to establish a clean baseline.
2. **When Changing Algorithms:** Write or update unit tests in `tests/unit/` first. Check coverage and property tests.
3. **When Modifying UI:** Use Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`). Do not use legacy Svelte 3/4 stores or syntax.
4. **When Adding Packages:** Pin exact versions in `package.json` (no `^` or `~`). Choose packages published $\ge 14$ days ago. Verify bundle size with `npm run build && npm run size`.
5. **After Changes:** Execute the full verification suite: `npm run typecheck && npm run lint && npm test && npm run test:perf && npm run build && npm run size`.
