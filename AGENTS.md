# AGENTS.md — Developer & Autonomous Agent Guide

Comprehensive, high-signal guide for AI agents and human contributors working on the **Diff Checker** codebase.

---

## 1. Project Overview & Architecture

**Diff Checker** is a high-performance, private, browser-only diff tool for text, scripts, and Jupyter notebooks (`.ipynb`), hosted as a static site on GitHub Pages.

- **Production URL:** `https://u77w41.github.io/diff-checker/` (Vite base path: `/diff-checker/`)
- **Execution Model:** Zero backend, 100% client-side computation inside Web Workers with Comlink.
- **Privacy Model:** Strict client-only isolation. Inputs and outputs never leave the browser. Zero analytics, telemetry, or cookies.

### Directory Structure & Key Files

```text
diff-checker/
├── .github/
│   ├── ISSUE_TEMPLATE/           # Bug report and feature request templates
│   └── workflows/
│       ├── ci.yml                # CI check on push/PR (lint, typecheck, tests, size, e2e)
│       └── deploy.yml            # Deployment to GitHub Pages on push to main
├── public/                       # Static public assets (favicons, bundled examples, theme-init.js)
├── src/
│   ├── app/                      # Application state, theme tokens, and settings persistence
│   │   ├── settings.ts           # LocalStorage settings manager (diff-checker:settings)
│   │   ├── theme.css             # Hugo "Stack" design tokens + colour-blind safe diff tokens
│   │   └── theme.ts              # Theme toggle & sync with StackColorScheme
│   ├── core/                     # Pure Algorithmic Core (Zero DOM/browser dependencies)
│   │   ├── nb-align/             # 4-pass cell alignment & token Dice similarity
│   │   │   ├── align.ts          # Passes 1-4: LIS ID anchors, LCS, Dice, Moves/Leftovers
│   │   │   └── similarity.ts     # Token bigram Dice similarity scoring (≥ 0.5 threshold)
│   │   ├── nb-diff/              # Notebook diffing engine
│   │   │   ├── diff.ts           # diffNotebook orchestrator & metadata header diffs
│   │   │   ├── metadata-diff.ts  # Key-by-key metadata diff (noisy key suppression)
│   │   │   ├── output-diff.ts    # Stream, error, image, and HTML output comparison
│   │   │   └── types.ts          # Notebook diff interfaces
│   │   ├── nb-parse/             # nbformat 4.x parser & sanitiser
│   │   │   ├── parse.ts          # Parser, duplicate ID stripper, attachment resolver
│   │   │   └── types.ts          # Notebook JSON AST types
│   │   ├── text-diff/            # Text diff engine
│   │   │   ├── diff.ts           # diffText using jsdiff with word/char intra-line spans
│   │   │   ├── normalise.ts      # Line normalisation (whitespace, case, CRLF, blank lines)
│   │   │   └── types.ts          # DiffOptions, TextDiffResult, CharChange, Hunk
│   │   ├── detect.ts             # Input mode detection (.ipynb JSON vs text)
│   │   ├── errors.ts             # DiffError class with spec codes
│   │   ├── file-reader.ts        # Binary check (null bytes in first 8 KB) & UTF-8 fallback
│   │   ├── hash.ts               # Fast FNV-1a & FNV-1a-32 non-cryptographic hashing
│   │   ├── patch.ts              # git apply-compatible unified diff patch generator
│   │   ├── remote.ts             # CORS-safe URL loader with standard error messaging
│   │   └── share.ts              # LZ-string #s= URL compressor & JSON bundle generator
│   ├── ui/                       # Svelte 5 User Interface
│   │   ├── nb-view/              # Notebook view components
│   │   │   ├── renderers/        # Specialized output renderers:
│   │   │   │   ├── ErrorDiff.svelte     # ANSI traceback diff with stripped escapes
│   │   │   │   ├── HtmlRenderer.svelte  # Sandboxed <iframe> (sandbox="")
│   │   │   │   ├── ImageDiff.svelte     # Side-by-side, swipe divider, onion-skin
│   │   │   │   ├── LargeOutputPlaceholder.svelte # > 1 MB click-to-load
│   │   │   │   ├── markdown.ts          # marked + DOMPurify + lazy KaTeX
│   │   │   │   ├── StreamDiff.svelte    # stdout / stderr stream diffing
│   │   │   │   └── UnsupportedOutput.svelte # Fallback for unknown MIME types
│   │   │   ├── CellCard.svelte   # Status badges, collapsible source/outputs/metadata
│   │   │   ├── NbFilterBar.svelte# Toggles for outputs, metadata, unchanged cells, slider
│   │   │   ├── NotebookView.svelte # View container with top metadata diff banner
│   │   │   ├── OutlineSidebar.svelte # Sticky left outline with smooth scrolling
│   │   │   └── UnchangedRun.svelte # Collapsible runs of unchanged cells
│   │   ├── text-view/            # Text diff components
│   │   │   ├── languages.ts      # Dynamic on-demand language syntax loaders
│   │   │   ├── TextView.svelte   # CodeMirror 6 merge view wrapper
│   │   │   └── theme.ts          # CodeMirror 6 custom theme reading CSS variables
│   │   ├── HelpModal.svelte      # Accessible keyboard shortcuts dialog (?)
│   │   ├── InputPanel.svelte     # Dual inputs (A/B), dropzones, upload, URL loader
│   │   ├── ShareModal.svelte     # URL share link generator (8 KB limit) & bundle export
│   │   └── Toolbar.svelte        # Navigation, stats, export patch, mobile folded menu
│   ├── worker/                   # Web Worker offloading via Comlink
│   │   ├── diff.worker.ts        # Worker entrypoint exposing diffText & diffNotebook
│   │   └── worker-client.ts      # WorkerManager singleton (10s timeout, cancel, fallback)
│   ├── App.svelte                # Root app shell, hash router, global shortcuts, <svelte:boundary>
│   └── main.ts                   # Entrypoint & self-hosted Lato font imports
└── tests/
    ├── e2e/                      # Playwright E2E tests (shell, features, axe-core a11y)
    ├── fixtures/notebooks/       # 6 golden notebook test pairs
    ├── perf/                     # 10,000-line text & 500-cell notebook benchmarks
    └── unit/                     # Vitest unit, property (fast-check), and security tests
```

### How the Diff Logic Works

#### 1. Text Diff Pipeline (`src/core/text-diff/`)

```
Original Texts (A, B)
        │
        ▼
Line Normalisation (`normaliseLine`)
(ignoreWhitespace, ignoreCase, ignoreLineEndings, ignoreBlankLines)
        │
        ▼
jsdiff `diffLines` on normalised strings
        │
        ▼
Word / Character Intra-Line Refinement (`diffWordsWithSpace` / `diffChars`)
        │
        ▼
CharChange[] offset mapping against ORIGINAL unnormalised text
        │
        ▼
CodeMirror 6 `diffConfig.override` consumption & Unified Patch Generation
```

#### 2. Notebook Diff Pipeline (`src/core/nb-align/` & `src/core/nb-diff/`)

```
Raw Notebook JSON (A, B)
        │
        ▼
Validation & Parsing (`parseNotebook` - nbformat 4.x check, duplicate ID removal)
        │
        ▼
4-Pass Cell Alignment (`alignCells`):
  ├── Pass 1: Unique ID Anchors via Longest Increasing Subsequence (LIS)
  ├── Pass 2: Exact Content LCS (type + source + outputs)
  ├── Pass 3: Greedy Token Dice Similarity (bigram tokens, score ≥ 0.5, 10k window)
  └── Pass 4: Move Detection & Leftover Classification (added / deleted)
        │
        ▼
Output Ordering: Strictly B-ordered; deleted cells placed after A partner's predecessor
        │
        ▼
Per-Cell Diffing:
  ├── Source diff via text diff engine
  ├── Output diff (stream, ANSI-stripped error tracebacks, images, sandboxed HTML)
  └── Metadata diff (key-by-key comparison with noisy key suppression)
```

---

## 2. Tech Stack & Dependencies

All dependencies must use exact pinned versions (no `^` or `~`), published at least 14 days prior to inclusion:

### Core Stack

- **Framework:** Svelte 5 (`5.57.3`) using Svelte Runes.
- **Build Tool:** Vite 8 (`8.3.5`) + `@sveltejs/vite-plugin-svelte` (`7.3.1`).
- **Language:** TypeScript (`6.0.3`) in strict mode.
- **Editor / Diff View:** CodeMirror 6 (`codemirror`, `@codemirror/merge`, `@codemirror/view`, `@codemirror/state`, `@codemirror/language`).
- **Worker RPC:** Comlink (`4.4.2`).
- **Algorithms:** `diff` (`9.0.0`), `lz-string` (`1.5.0`), custom FNV-1a hashing.
- **Rendering & Sanitization:** `marked` (`15.0.7`), `dompurify` (`3.2.4`), `katex` (`0.19.1` - lazy-loaded).
- **Offline / PWA:** `vite-plugin-pwa` (`2.0.0`) with Workbox service worker caching.
- **Typography:** Self-hosted `@fontsource/lato` (`5.3.0` weights 300, 400, 700).

### Testing & Verification

- **Unit & Property Tests:** Vitest (`5.0.5`), `fast-check` (`4.10.2`), `@vitest/coverage-v8` (`5.0.5`), `jsdom` (`30.1.3`).
- **E2E & Accessibility:** Playwright (`1.58.0`), `@axe-core/playwright` (`4.10.1`).
- **Bundle Budget:** `size-limit` (`14.3.0`), `@size-limit/file` (`14.3.0`).
- **Linter & Formatter:** ESLint 9 (`eslint`, `eslint-plugin-svelte`, `typescript-eslint`), Prettier 3 (`prettier`, `prettier-plugin-svelte`).

---

## 3. Exact Commands

### Running & Building

```bash
# Install exact dependencies
npm ci

# Start local dev server (port 5173)
npm run dev

# Build production bundle & PWA service worker
npm run build

# Preview production build locally (port 4173)
npm run preview
```

### Quality, Linting & Typechecking

```bash
# Typecheck Svelte runes and TypeScript
npm run typecheck

# Lint all files and verify Prettier formatting
npm run lint

# Auto-format codebase with Prettier
npm run format
```

### Testing & Verification Chain

```bash
# Run all unit, property, and fixture tests
npm test

# Run performance benchmarks (< 1000 ms targets)
npm run test:perf

# Verify bundle size budget (≤ 250 KB initial JS)
npm run size

# Run Playwright E2E and axe-core accessibility tests
npm run test:e2e
```

---

## 4. Coding Conventions & Style Rules

### Svelte 5 Runes Only

- Always use Svelte 5 Runes: `$state`, `$derived`, `$props`, `$effect`, `$bindable`.
- Never use deprecated Svelte 3/4 stores (`writable`, `derived`, `readable`), legacy `export let`, or reactive declarations (`$: ...`).
- Wrap major UI sections in `<svelte:boundary>` with user-friendly retry and reload actions.

### Pure Core Isolation (`src/core/`)

- All modules under `src/core/` **must remain 100% pure TypeScript** without browser-specific globals (`window`, `document`, DOM nodes, `localStorage`, `fetch`).
- Tests in `tests/unit/` run in Vitest's `node` environment to guarantee portability to Web Workers.
- Every function in `src/core/` should be deterministic and unit-tested.

### Code Style & Formatting

- **Quotes:** Single quotes (`'...'`), except within JSON and HTML attributes.
- **Semicolons:** Always terminate statements with semicolons.
- **Trailing Commas:** None (`trailingComma: "none"` in `.prettierrc`).
- **Line Width:** 100 characters max (`printWidth: 100`).
- **Indentation:** 2 spaces.

### Strongly Typed TypeScript

- Strict mode is enabled (`tsconfig.json`). Do not use `any` without an explicit lint disable and comment.
- Define strict interfaces for payloads, options, and returns (e.g. `DiffOptions`, `TextDiffResult`, `NbCell`, `SharePayload`).

### Accessibility (a11y) & Semantic HTML

- Maintain WCAG 2.1 AA compliance:
  - Touch targets must be at least $44 \times 44$ px.
  - Interactive elements must be keyboard-accessible (`Tab`, `Enter`, `Space`, `Escape`).
  - Modal backdrops must have keyboard dismissal and proper ARIA roles (`role="dialog"`, `aria-modal="true"`).
  - Use semantic landmarks (`<header>`, `<main id="main">`, `<footer>`, `role="toolbar"`, `role="region"`).
  - ARIA live region (`aria-live="polite"`) announces additions and deletions after diff completion.

---

## 5. Guardrails — What Never to Touch or Break

1. **Client-Side Privacy Constraint (Zero Backend):**

   - **Never** add network telemetry, tracking scripts, cookies, or remote server endpoints.
   - User inputs and notebooks must remain in browser memory.
   - Remote file fetching (`src/core/remote.ts`) must only be initiated on direct user action, supporting CORS-enabled endpoints (`raw.githubusercontent.com`).

2. **Security & Sanitization Standards:**

   - **Zero raw `innerHTML`:** Markdown and HTML outputs must always pass through `DOMPurify.sanitize()`.
   - **Sandboxed HTML Outputs:** Notebook HTML outputs must render strictly inside sandboxed `<iframe>` elements (`sandbox=""`, no `allow-scripts`, no `allow-same-origin`) using `srcdoc`.
   - **Attachments Only:** Notebook images must resolve strictly to internal `data:` URLs from cell attachments. Never fetch external images from inside notebooks.
   - **Strict CSP:** Keep the Content Security Policy in `index.html` intact (`script-src 'self'`). Never write inline scripts or inline event handlers.

3. **Bundle Size Budget ($\le 250$ KB Initial JS):**

   - The initial JS bundle (checked by `.size-limit.json`) must remain $\le 250$ KB.
   - Heavy libraries like KaTeX must always be dynamically imported (`await import('katex')`) only when math formulas (`$...$` or `$$...$$`) are detected.
   - Do NOT bundle Node-specific libraries (`jsdom`, `fs`, `path`) into client assets.

4. **LocalStorage Wrap & Privacy:**

   - All `localStorage` reads and writes must be wrapped in `try/catch`. The app must function without errors if storage is blocked or quotas are exceeded.
   - **Never save inputs by default.** Inputs may only be stored when the user explicitly checks _"Remember inputs on this device"_.

5. **Brand Identity & Header/Footer Links:**
   - Maintain the Hugo "Stack" design system in `src/app/theme.css` matching [Support my work](https://u77w41.github.io/support-my-work/).
   - Always preserve the top and bottom "Support my work" links and dark/light mode toggle synchronized with `StackColorScheme`.
