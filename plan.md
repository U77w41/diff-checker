# Diff Checker — Build Spec & Implementation Plan

Oct 31, 2026 · @Ujjwal Chowdhury

## How to use this document

This is the complete build brief for a public, browser-only diff checker for text/scripts and Jupyter notebooks, hosted on GitHub Pages. Give the whole document to the AI builder; it should build exactly what is specified here, one phase at a time.

Rules for the AI builder:

1. Build the phases in the Implementation plan in order. Meet every acceptance criterion of a phase before starting the next, then stop and report.
2. Use test-driven development for everything in `src/core/`: write the failing test first, then the code.
3. Do not build anything listed under Out of scope.
4. No backend, no runtime calls to external APIs, no analytics, no cookies.
5. When something is ambiguous, choose the simplest option consistent with this spec and list it under "Assumptions" in the phase report.
6. Keep files small and single-purpose. `src/core/` must never import from `src/ui/`, `src/app/` or any DOM API.
7. Pin exact dependency versions in `package.json` and commit the lockfile.
8. Phase report format: what was built, how to run it, test results, assumptions, open questions.

If you have the superpowers skills, use superpowers:writing-plans to turn each phase into a step-by-step TDD plan before coding, then execute it with superpowers:subagent-driven-development or superpowers:executing-plans.

## Project settings

The tool is called Diff Checker and lives at `https://u77w41.github.io/diff-checker/`. Wherever this document says `<user>`, `<repo>` or `<Product name>`, use the values below.

| Setting | Value |
| --- | --- |
| Product name (`<Product name>`) | Diff Checker |
| GitHub user (`<user>`) | `u77w41` (account U77w41) |
| Repository (`<repo>`) | `diff-checker` — `https://github.com/U77w41/diff-checker` |
| Live URL | `https://u77w41.github.io/diff-checker/` |
| Page title | Diff Checker · Ujjwal Chowdhury |
| Issues page | `https://github.com/U77w41/diff-checker/issues` |
| Copyright launch year | 2026 |
| Settings storage key | `diff-checker:settings` |
| Theme storage key | `StackColorScheme` (shared with the Support my work page) |
| Licence | MIT |

## Product overview

The product is a free, public web tool that compares two texts, scripts or Jupyter notebooks entirely in the browser. Its differentiator is a notebook-aware diff that understands cells, outputs and metadata instead of showing raw JSON.

**Audience:** anyone — developers, data scientists, students, reviewers.

**Goals**

1. Fast, readable text and code diffs with word- and character-level highlighting.
2. A cell-aware notebook diff covering source, outputs and metadata, with noise hidden by default.
3. Privacy by design: files never leave the user's browser.

**Success criteria**

| Criterion | Target |
| --- | --- |
| Initial JS bundle | < 250 KB gzipped |
| Lighthouse performance (mobile) | ≥ 90 |
| 10,000-line text diff | < 1 s |
| 500-cell notebook diff with images | < 1 s |
| Browsers | Latest Chrome, Firefox, Safari and Edge, desktop and mobile |
| Network requests after first load | None, except a URL fetch the user starts |

## Hard constraints (GitHub Pages)

The site is static files on GitHub Pages, so every feature must run client-side with no server.

1. **No server code.** All parsing and diffing runs in the browser in TypeScript, inside a Web Worker. No database, login or server-side storage.
2. **Privacy.** Inputs are never uploaded. The UI states "Runs entirely in your browser — nothing is uploaded."
3. **Base path.** The site is served from `https://u77w41.github.io/diff-checker/`. Set Vite `base` to `/diff-checker/` and make every asset path relative to it.
4. **Routing.** Hash routes only: `#text`, `#notebook` and `#s=<data>`, because Pages cannot rewrite URLs to `index.html`. Any other hash leaves the current route unchanged. The "Skip to content" link must not change the hash: it calls `preventDefault` and moves focus to `<main id="main" tabindex="-1">`.
5. **Security headers.** Pages cannot set HTTP headers, so the Content-Security-Policy goes in a `<meta http-equiv>` tag in `index.html`. No inline scripts anywhere.
6. **Sharing.** There is no backend to store diffs. Small diffs are shared by compressing both inputs into the URL hash; larger ones are downloaded as a file.
7. **Remote files.** "Load from URL" works only for hosts that send CORS headers, such as `raw.githubusercontent.com` and `gist.githubusercontent.com`. Other hosts must fail with a clear message suggesting download and upload instead.
8. **Deployment.** GitHub Actions builds the site and publishes it with the official Pages deploy actions. A `.nojekyll` file must be included in the build output.

## Tech stack and repository structure

The stack is Vite + TypeScript + Svelte 5, with CodeMirror 6 for the text diff view and a custom notebook layer.

| Concern | Choice | Notes |
| --- | --- | --- |
| Build | Vite 8 + `@sveltejs/vite-plugin-svelte` 7 | `base: '/diff-checker/'` |
| Language | TypeScript 6.x, `strict: true` | Not 7.x: `svelte-check` supports TypeScript 5–6 only. No `any` in `src/core/` |
| Type checking | `svelte-check` | Run by `npm run typecheck` |
| UI framework | Svelte 5 | Small bundle; `<svelte:boundary>` for error boundaries |
| Text diff view | CodeMirror 6 + `@codemirror/merge` 6.x | Read-only `MergeView` (side-by-side) and `unifiedMergeView` (unified). The diff comes from the worker through `diffConfig.override`; CodeMirror never computes its own |
| Diff algorithm | `diff` (jsdiff) 9.x | Line, word and character diffs and patch output; `diffChars` works on Unicode code points |
| Cell similarity | Token Dice coefficient in `src/core/nb-align/similarity.ts` | No library; formula in Notebook diff |
| Syntax highlighting | `@codemirror/lang-*` packages | Python, JavaScript/TypeScript, JSON, Markdown, SQL, YAML, HTML, CSS; each loaded on demand |
| Worker messaging | Comlink 4 | Typed worker API |
| Markdown rendering | `marked` | Output always passed through DOMPurify |
| HTML sanitising | DOMPurify 3 | All rendered HTML |
| Math | KaTeX | Loaded lazily, only for notebooks |
| Share-link compression | `lz-string` 1.5 | `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent` |
| Hashing | FNV-1a, implemented in `src/core/hash.ts` | Fast, non-cryptographic, for cell matching only |
| Font | `@fontsource/lato` (300, 400, 700) | Self-hosted |
| Unit tests | Vitest 5 + fast-check 4 | Node environment for `src/core/` |
| End-to-end tests | `@playwright/test` + `@axe-core/playwright` | Chromium, Firefox, WebKit |
| Lint and format | ESLint + Prettier | Run in CI |
| Bundle budget | `size-limit` | Fails CI above budget |
| Offline support | `vite-plugin-pwa` 2 | `injectRegister: 'script'` (the CSP forbids inline scripts); `scope` and `start_url` = `/diff-checker/` |

**Version policy:** pin exact versions. For each package, choose the newest release published at least 14 days before you install it, staying on the major versions above (compatibility checked on 31 Oct 2026).

```text
/
├─ index.html                 # CSP meta, SEO and Open Graph tags
├─ vite.config.ts
├─ public/
│  ├─ .nojekyll
│  ├─ favicon.svg
│  └─ examples/               # sample text and notebook pairs
├─ src/
│  ├─ core/                   # pure TS, no DOM — fully unit-tested
│  │  ├─ hash.ts
│  │  ├─ text-diff/           # normalise.ts, diff.ts, types.ts
│  │  ├─ nb-parse/            # parse.ts, validate.ts, types.ts
│  │  ├─ nb-align/            # align.ts, similarity.ts
│  │  ├─ nb-diff/             # cell-diff.ts, output-diff.ts, metadata-diff.ts
│  │  └─ detect.ts            # input type detection
│  ├─ worker/
│  │  └─ diff.worker.ts       # exposes core via Comlink
│  ├─ ui/
│  │  ├─ text-view/           # CodeMirror merge wrapper, toolbar
│  │  ├─ nb-view/             # cell list, outline, filters
│  │  └─ renderers/           # markdown, math, image-compare, html-sandbox, traceback
│  ├─ app/                    # input panel, router, settings, share, theme, shortcuts
│  └─ main.ts
├─ tests/
│  ├─ unit/                   # mirrors src/core
│  ├─ fixtures/notebooks/     # golden notebook pairs + expected snapshots
│  ├─ perf/
│  └─ e2e/
├─ .github/workflows/
│  ├─ ci.yml
│  └─ deploy.yml
├─ README.md
└─ LICENSE                    # MIT
```

## Architecture and data flow

All diff logic lives in pure TypeScript modules under `src/core/`, run inside a Web Worker. The UI only renders the plain result objects they return.

**Dependency rules**

1. `core` depends on nothing in the app and uses no DOM APIs.
2. `worker` depends only on `core`.
3. `ui` and `app` depend on `core` types and call the worker; never the reverse.

**Data flow**

1. The user pastes, uploads, drops or loads two inputs.
2. `core/detect.ts` decides the mode: `.ipynb` extension, or JSON containing `cells` and `nbformat`, means notebook; anything else is text.
3. The app sends both inputs and the current options to the worker.
4. The worker parses notebooks once and caches the parsed result, keyed by the input text.
5. The worker runs the diff and returns a plain, serialisable result object.
6. Text mode: the view creates the CodeMirror merge view with `diffConfig.override` returning the worker's `changes` for exactly those two texts. Notebook mode: the notebook view renders the `NotebookDiffResult`.
7. Changing an option re-runs matching and diffing, using the cached parse.
8. Starting a new diff cancels the previous one by terminating and respawning the worker.

**Core types and worker API**

```ts
// ---------- text diff ----------
export interface DiffOptions {
  ignoreWhitespace: boolean;   // collapse runs of spaces/tabs, trim line ends
  ignoreCase: boolean;
  ignoreLineEndings: boolean;  // treat CRLF and LF as equal (default true)
  ignoreBlankLines: boolean;
  granularity: 'word' | 'char'; // intra-line highlighting
}

export interface InlineSpan { from: number; to: number; kind: 'add' | 'del' }

// Character offsets in the ORIGINAL (not normalised) texts, in the shape
// @codemirror/merge's Change expects. Returned through diffConfig.override.
export interface CharChange { fromA: number; toA: number; fromB: number; toB: number }

export interface DiffLine {
  kind: 'context' | 'add' | 'del';
  oldNo?: number;      // 1-based line number in A
  newNo?: number;      // 1-based line number in B
  text: string;        // original text, not normalised
  inline?: InlineSpan[];
}

export interface Hunk {
  oldStart: number; oldLines: number;
  newStart: number; newLines: number;
  lines: DiffLine[];
}

export interface TextDiffResult {
  identical: boolean;
  changes: CharChange[];   // for the CodeMirror view; sorted, non-overlapping
  hunks: Hunk[];
  stats: { added: number; removed: number };
}

// ---------- notebook model ----------
export type CellType = 'code' | 'markdown' | 'raw';

export type NbOutput =
  | { kind: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { kind: 'rich'; outputType: 'execute_result' | 'display_data';
      data: Record<string, string>; metadata: Record<string, unknown> }
  | { kind: 'error'; ename: string; evalue: string; traceback: string[] };

export interface NbCell {
  id?: string;                 // nbformat >= 4.5
  type: CellType;
  source: string;              // source array joined into one string
  outputs: NbOutput[];         // empty for markdown/raw
  executionCount: number | null;
  metadata: Record<string, unknown>;
  /* no hash field */                // match keys depend on DiffOptions; computed in core/nb-align
}

export interface Notebook {
  nbformat: number; nbformatMinor: number;
  metadata: Record<string, unknown>;   // kernelspec, language_info, ...
  cells: NbCell[];
}

// ---------- notebook diff ----------
export interface NbDiffOptions extends DiffOptions {
  similarityThreshold: number;   // default 0.5
  hideExecutionCount: boolean;   // default true
  hideNoisyMetadata: boolean;    // default true
  includeOutputs: boolean;       // default true
}

export type CellOp =
  | { op: 'unchanged'; a: number; b: number }
  | { op: 'modified';  a: number; b: number; similarity: number }
  | { op: 'moved';     a: number; b: number }
  | { op: 'added';     b: number }
  | { op: 'deleted';   a: number };

export type OutputDiff =
  | { kind: 'same' }
  | { kind: 'added'; output: NbOutput }
  | { kind: 'removed'; output: NbOutput }
  | { kind: 'text'; mime: string; diff: TextDiffResult }   // stream, text/plain, error, html source
  | { kind: 'image'; mime: string; a: string; b: string }  // base64 data
  | { kind: 'html'; a: string; b: string; sourceDiff: TextDiffResult };

export interface MetadataDiff {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { a: unknown; b: unknown }>;
  hiddenKeys: string[];          // noisy keys suppressed by options
}

export interface CellDiff {
  op: CellOp;
  typeChanged?: { from: CellType; to: CellType };
  source?: TextDiffResult;
  outputs?: OutputDiff[];
  metadata?: MetadataDiff;
}

export interface NotebookDiffResult {
  header: { field: string; a: unknown; b: unknown }[]; // kernel, language, nbformat
  cells: CellDiff[];             // in B order, deleted cells placed at their A position
  stats: { added: number; deleted: number; modified: number; moved: number; unchanged: number };
}

// ---------- worker API (Comlink) ----------
export interface DiffWorkerApi {
  diffText(a: string, b: string, opts: DiffOptions): Promise<TextDiffResult>;
  diffNotebook(a: string, b: string, opts: NbDiffOptions): Promise<NotebookDiffResult>;
}
```

Parse errors are thrown as `DiffError { code: 'BINARY' | 'INVALID_JSON' | 'UNSUPPORTED_NBFORMAT' | 'TOO_LARGE' | 'CANCELLED'; message: string; line?: number; column?: number }` and handled by the app as described in Error handling.

## Text and script diff

Text mode compares any two plain-text inputs line by line, with highlighting inside changed lines.

1. **Input**
   - Two panels labelled Original (A) and Modified (B), each accepting paste, file upload, or drag-and-drop.
   - A file dropped anywhere on the page goes into the empty side; if both are full, ask which side to replace.
   - Show each file's name and size. Provide Swap (A↔B) and Clear buttons.
   - Optional "Load from URL" per side (CORS-enabled hosts only).
   - Decode files with `new TextDecoder('utf-8', { fatal: true })`. If that throws, decode again without `fatal` and show: "This file isn't valid UTF-8; unreadable characters are shown as �." Strip a leading byte-order mark.
2. **Normalisation** (for comparison only; the original text is always displayed)
   - Ignore line endings: on by default.
   - Ignore whitespace (collapse runs of spaces and tabs to one space, trim each line), ignore case, ignore blank lines: off by default.
   - Normalise each line on its own and keep a map from comparison index to original line number. With ignore blank lines on, blank lines are left out of the comparison and shown as unchanged context.
3. **Diff**
   - Line diff with jsdiff `diffLines` on the normalised line sequence, mapped back to original line numbers.
   - Within each hunk, pair removed and added lines in order (first removed with first added, and so on). For each pair, run `diffWordsWithSpace` (word mode, default) or `diffChars` (character mode) on the original lines to get `InlineSpan`s.
   - Skip intra-line highlighting for lines longer than 10,000 characters.
   - Build `changes` (character offsets in the original texts): one entry per intra-line span for paired lines, one entry covering the whole line for unpaired added or removed lines; merge adjacent entries.
4. **Views**
   - Side-by-side: `MergeView` (default on screens ≥ 768 px). Unified: an editor on B with `unifiedMergeView({ original: A, mergeControls: false })`.
   - Both views read-only (`EditorState.readOnly.of(true)` and `EditorView.editable.of(false)`), no revert controls, `diffConfig: { override: () => changes }`.
   - Line numbers; `gutter: true` for change markers; `+` and `−` symbols in the gutter.
   - Syntax highlighting chosen by file extension and loaded on demand, falling back to plain text. A language picker can override it.
   - All colours from the diff tokens in Visual design and branding.
5. **Navigation**
   - Previous/next change with `goToPreviousChunk` / `goToNextChunk`, and a counter such as "Change 3 of 12" (one change = one CodeMirror chunk).
   - Stats shown as "+12 −5 lines".
   - `collapseUnchanged: { margin: 3, minSize: 6 }`: unchanged runs of 6 or more lines collapse, keeping 3 lines of context each side; clicking the collapsed bar expands that run.
   - Change markers on the scrollbar: a thin overlay strip beside the editor with one mark per chunk, placed proportionally; clicking a mark scrolls to that chunk.
6. **Identical inputs:** show a clear "No differences" message, noting which ignore options are on.
7. **Export**
   - Copy unified diff to clipboard; download `diff.patch` made with jsdiff `createTwoFilesPatch` from the original texts (ignore options do not apply).
   - Both headers use A's file name — `--- a/<nameA>` and `+++ b/<nameA>` — or `file.txt` for pasted text, so `git apply` patches A's file. Different names make `git apply` look for B's file and fail.

## Notebook (.ipynb) diff

Notebook mode matches cells between the two notebooks, then diffs each matched pair's source, outputs and metadata separately.

**Parsing (`core/nb-parse`)**

1. Accept nbformat 4.x. Older versions raise `UNSUPPORTED_NBFORMAT`.
2. Fill missing fields with defaults: `nbformat_minor` 0, cell `metadata` `{}`, `outputs` `[]`, `execution_count` `null`.
3. `source` and stream `text` may be a string or an array of strings; join arrays into one string.
4. Map each output to the `NbOutput` union. Join array-valued mime data (e.g. `text/html` as a list of strings) into one string.
5. Markdown cell `attachments`: when rendering, resolve `attachment:<name>` image references to `data:` URLs from that cell's own attachments.
6. Cell IDs: keep a cell's `id` only if it is unique within its notebook; cells with duplicated IDs are treated as having no ID.

**Cell matching (`core/nb-align`), four passes**

Each cell's **match key** is the FNV-1a hash of its cell type plus its source normalised with the current `DiffOptions`, so ignore options also apply to matching. Keys are recomputed when options change; parsing is not repeated.

1. **Cell IDs.** Pair cells whose ID appears in both notebooks. These pairs are fixed anchors.
2. **Exact matches.** Between consecutive anchors, run a longest-common-subsequence over match keys. Matched cells are `unchanged`.
3. **Modified cells.** For each remaining gap (the unmatched cells between two consecutive matched pairs):
   - If the gap has exactly one cell on each side, pair them as `modified`, setting `typeChanged` if their types differ.
   - Otherwise, score every same-type A×B pair with the similarity below. Take pairs greedily from the highest score (ties: lowest A index, then lowest B index), skipping any pair that would cross a pair already taken. Keep pairs scoring ≥ `similarityThreshold` (default 0.5) as `modified`.
   - If a gap has more than 10,000 candidate pairs, score only pairs whose positions within the gap differ by at most 25.
4. **Moves and leftovers.** Scanning A in order, an unpaired A cell whose match key equals an unpaired B cell's key is `moved` (take the first such B cell). A cell that was both moved and edited appears as `deleted` + `added`. Everything else is `deleted` (A only) or `added` (B only).

**Similarity** (`core/nb-align/similarity.ts`): split each source into tokens with `/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu` (words, plus each punctuation character on its own; whitespace ignored). Similarity = 2 × (size of the multiset intersection of the two token lists) ÷ (tokens in A + tokens in B). Two empty cells score 1. Use these as unit-test reference values:

| A | B | Similarity |
| --- | --- | --- |
| `df.plot()` | `df.plot(kind="bar")` | 0.67 |
| `import pandas as pd` | `import numpy as np` | 0.50 |
| `x = 1` | `y = 2` | 0.33 |
| `# Title` | `# A completely different heading about plots` | 0.22 |

**Output order** (`NotebookDiffResult.cells`): emit B's cells in B order, each with its op (`unchanged`, `modified`, `moved` or `added`). Emit each `deleted` A cell immediately after the op of the nearest earlier A cell that has a B partner, keeping A order among deleted cells; deleted cells with no such earlier cell come first.

**Output diff (`core/nb-diff/output-diff.ts`)**

Outputs are compared by position within the cell. If the output types differ at a position, show `removed` + `added`.

| Output | How it is compared | How it is shown |
| --- | --- | --- |
| `stream` (stdout/stderr) | Text diff of the joined text | Monospace diff block |
| `error` | Text diff of `ename: evalue` + traceback, ANSI codes stripped | Red-tinted monospace diff |
| Rich, `image/png` or `image/jpeg` | Base64 equality | Identical → one image; different → image comparison view |
| Rich, `image/svg+xml` | Text equality, rendered as an image via data URL | Same as PNG |
| Rich, `text/html` | Text diff of the source | Rendered side by side in sandboxed iframes, with a "View source diff" toggle |
| Rich, `text/markdown` / `text/latex` | Text diff of the source | Rendered with marked/KaTeX, source diff toggle |
| Rich, `text/plain` | Text diff | Monospace diff block |
| `application/javascript`, widget mime types | Not compared | Placeholder: "Unsupported output type — not rendered for security" |

For rich outputs, use the first mime type present in this order: PNG, JPEG, SVG, HTML, Markdown, LaTeX, plain text.

**Image comparison view:** three modes — side-by-side (default), swipe (a draggable divider over the two images), onion-skin (an opacity slider).

**Metadata diff (`core/nb-diff/metadata-diff.ts`)**

1. Diff cell metadata and notebook metadata key by key; nested objects are compared by their JSON text.
2. When `hideNoisyMetadata` is on (default), suppress these keys and list them in `hiddenKeys`: `collapsed`, `scrolled`, `ExecuteTime`, `execution`, and everything under `jupyter`.
3. When `hideExecutionCount` is on (default), ignore `execution_count` on cells and on `execute_result` outputs.
4. The notebook header shows changes to `kernelspec.name`, `language_info.name`, `language_info.version` and the nbformat version.

**Markdown cells:** show both rendered views side by side (marked + DOMPurify, KaTeX for `$…$` and `$$…$$`) and the source diff, switchable with a tab control. Unchanged markdown cells show rendered only.

## UI and interaction

The app is a single page with two modes, Text and Notebook, sharing one input panel and toolbar.

**Layout, top to bottom**

1. **Site header** (same as the Support my work page): brand block linking to `https://u77w41.github.io/`, nav links Hire Me, Anurup and **Support my work**, and the round theme toggle. Details in Visual design and branding.
2. **App bar:** product name, `Text | Notebook` tabs, Share, Help (`?`).
3. **Privacy line:** "Runs entirely in your browser — nothing is uploaded."
4. **Input panel:** the two input panels side by side (stacked on mobile), with Swap, Clear and **Try an example**. After the first diff, the panel collapses to a one-line bar showing both file names and an Edit button.
5. **Toolbar:** view toggle (side-by-side/unified), granularity (word/character), ignore options, previous/next change, change counter and stats.
6. **Results area:** the text diff view or the notebook diff view.
7. **Site footer** (same as the Support my work page): footer links, privacy line, **Support my work** link, copyright.

**Behaviour**

1. The diff runs automatically when both sides have content; `Ctrl/Cmd+Enter` forces a run.
2. Typing or pasting re-runs the diff after a 300 ms pause.
3. Show a progress indicator if a diff takes longer than 200 ms.
4. Drop overlay: dragging a file over the page shows "Drop to compare".
5. **Try an example** loads a bundled pair from `public/examples/` (one Python script pair, one notebook pair with a changed plot, a reordered cell and an error output).

**Notebook view**

1. A left sidebar outline lists every non-unchanged cell with an icon (added, deleted, modified, moved) and its first line; clicking scrolls to it.
2. Each cell is a card with a status badge, cell type and, where relevant, "Moved from cell 4" or "Type changed: code → markdown".
3. Each card has three collapsible parts: Source, Outputs, Metadata. Parts with no changes start collapsed.
4. Runs of unchanged cells collapse to a row: "8 unchanged cells — show".
5. Filter bar: Hide outputs, Hide metadata, Show unchanged cells, and an Advanced popover with the similarity threshold slider (0.3–0.9).
6. Outputs larger than 1 MB are collapsed behind "Large output (2.4 MB) — click to load".

**Mobile (viewport under 768 px)**

1. Unified view only; the side-by-side option is hidden.
2. The notebook outline becomes a slide-out drawer.
3. Toolbar controls fold into a `⋯` menu, keeping previous/next visible.
4. Touch targets at least 44 × 44 px.

**Keyboard shortcuts**

| Key | Action |
| --- | --- |
| `n` / `p` | Next / previous change |
| `u` | Toggle unified / side-by-side |
| `Ctrl/Cmd+Enter` | Run diff |
| `?` | Show shortcuts |
| `Esc` | Close dialog or drawer |

Shortcuts are disabled while focus is in an input.

**Share links**

1. Share compresses `{mode, a, b, options}` with lz-string into `#s=<data>`.
2. Before showing the link, warn: "Anyone with this link can read both inputs."
3. If the compressed data exceeds 8 KB, disable the link and offer "Download diff bundle" (a `.json` file with the same payload) plus an "Open bundle" button that loads one.
4. Opening a share link loads the inputs and runs the diff.

**Persistence (localStorage)**

- Saved as one JSON object under `diff-checker:settings`: view mode, granularity, ignore options, notebook filters, similarity threshold. The theme is stored separately under `StackColorScheme` (see Visual design and branding).
- Never saved by default: input contents. A "Remember inputs on this device" setting is off by default; if storage is full or blocked, show "Couldn't save inputs on this device" and carry on.
- Wrap every localStorage read and write in `try/catch`; the app must work with storage disabled.

**Theming and accessibility**

1. Light and dark themes using the tokens in Visual design and branding. Default follows `prefers-color-scheme`; the toggle overrides it.
2. Colour-blind-safe add/remove palette (blue/orange family, tokens in Visual design and branding), always paired with `+`/`−` symbols.
3. An ARIA live region announces "12 additions, 5 deletions" after each diff.
4. Visible focus outlines; all controls reachable by keyboard; WCAG 2.1 AA contrast.

## Visual design and branding

The site must look like part of the same family as [Support my work](https://u77w41.github.io/support-my-work/), which follows the Hugo "Stack" theme of `u77w41.github.io`. Reuse its tokens, header and footer exactly. Add "Support my work" links at the top and bottom, the way [Anurup](https://u77w41.github.io/anurup/) does.

**Theme tokens** — copy into `src/app/theme.css`. The first two blocks are taken from the Support my work stylesheet; the diff tokens are new for this tool.

```css
:root {
  /* Light (default) — from support-my-work/styles.css */
  --body-background: #f5f5fa;
  --card-background: #ffffff;
  --card-background-muted: #f7f7fb;
  --text-main: #111418;
  --text-body: #4f5660;
  --text-muted: #6b7079;
  --border: #e3e4ec;
  --border-strong: #cfd1dc;
  --accent: #34495e;
  --accent-darker: #2c3e50;
  --accent-text: #ffffff;
  --focus-ring: #3b82f6;
  --danger: #b4232c;
  --danger-bg: rgba(180, 35, 44, 0.07);
  --success: #1f7a3a;
  --shadow-l1: 0 4px 8px rgba(0,0,0,.04), 0 0 2px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.04);
  --shadow-l2: 0 10px 20px rgba(0,0,0,.04), 0 2px 6px rgba(0,0,0,.04), 0 0 1px rgba(0,0,0,.04);
  --font-sans: "Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", "Droid Sans", "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius-card: 10px;
  --radius-control: 8px;
  --radius-tag: 4px;
  --container: 960px;       /* header, footer, intro text */
  --container-wide: 1440px; /* new: results area, for side-by-side diffs */
  --gutter: 16px;

  /* New for the diff tool: colour-blind-safe blue (added) / orange (removed) */
  --diff-add-bg: rgba(59, 130, 246, 0.12);
  --diff-add-strong: rgba(59, 130, 246, 0.30);  /* intra-line highlight */
  --diff-add-marker: #1d4ed8;
  --diff-del-bg: rgba(234, 88, 12, 0.10);
  --diff-del-strong: rgba(234, 88, 12, 0.28);
  --diff-del-marker: #c2410c;
  --diff-move: #7c3aed;
  --diff-move-bg: rgba(124, 58, 237, 0.10);
  color-scheme: light;
}

:root[data-scheme="dark"] {
  /* Dark — from support-my-work/styles.css */
  --body-background: #303030;
  --card-background: #424242;
  --card-background-muted: #3a3a3a;
  --text-main: rgba(255, 255, 255, 0.92);
  --text-body: rgba(255, 255, 255, 0.75);
  --text-muted: rgba(255, 255, 255, 0.6);
  --border: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.22);
  --accent: #ecf0f1;
  --accent-darker: #bdc3c7;
  --accent-text: #111418;
  --focus-ring: #8ab4ff;
  --danger: #ff9a9f;
  --danger-bg: rgba(255, 120, 128, 0.1);
  --success: #8fe0a6;
  --shadow-l1: 0 4px 8px rgba(0,0,0,.18), 0 0 2px rgba(0,0,0,.2);
  --shadow-l2: 0 10px 20px rgba(0,0,0,.22), 0 2px 6px rgba(0,0,0,.2);

  /* New diff tokens, dark */
  --diff-add-bg: rgba(138, 180, 255, 0.14);
  --diff-add-strong: rgba(138, 180, 255, 0.32);
  --diff-add-marker: #8ab4ff;
  --diff-del-bg: rgba(251, 146, 60, 0.14);
  --diff-del-strong: rgba(251, 146, 60, 0.32);
  --diff-del-marker: #fdba74;
  --diff-move: #c4b5fd;
  --diff-move-bg: rgba(196, 181, 253, 0.12);
  color-scheme: dark;
}
```

The CodeMirror theme and all notebook views must read colours only from these variables. Check every new diff token for WCAG AA contrast against `--card-background` in both schemes.

**Theme switching** (same behaviour as the Support my work page)

1. The scheme is set as `data-scheme="light"` or `"dark"` on `<html>`.
2. The preference is stored in localStorage under `StackColorScheme` with values `light`, `dark` or `auto`. This is the same key the Support my work page and the Hugo blog use, and all of them share the `u77w41.github.io` origin, so a choice made on one site carries over to the others.
3. `auto` (the default) follows `prefers-color-scheme` and updates live when the system setting changes. When the toggle lands on the system scheme, store `auto`.
4. Apply the scheme before first paint from a small external script, `public/theme-init.js`, loaded without `defer` in `<head>`. It must be external because the CSP forbids inline scripts.
5. After first paint, add the `theme-ready` class to `<html>`; only then enable `transition: background-color .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease` on themed surfaces, so the first load doesn't animate.
6. `<meta name="theme-color">`: `#f5f5fa` for light and `#303030` for dark, using two tags with `media` attributes.

**Typography**

1. Font: Lato 300/400/700, **self-hosted** via `@fontsource/lato` (the Support my work page loads it from Google Fonts; this tool must not make third-party requests).
2. Body: 16 px, line-height 1.6, colour `--text-body`, antialiased.
3. Page title (h1): 32 px, weight 700, line-height 1.2, letter-spacing −0.01em, colour `--text-main`.
4. Intro paragraph: 17 px, line-height 1.7, max-width 680 px.
5. Field labels: 14 px, weight 700, colour `--text-main`.
6. Code, diffs and file names: `--font-mono`.

**Components**

1. **Cards** (input panels, toolbar, notebook cell cards): `--card-background`, 1 px `--border`, `--radius-card`, `--shadow-l1`.
2. **Primary button** (Compare, Copy link): `--accent` background, `--accent-text`, weight 700, `--radius-card`, `--shadow-l1`, minimum height 44 px.
3. **Secondary/ghost buttons** (Swap, Clear, Download): `--card-background`, 1 px `--border`, `--radius-control`; on hover `--border-strong` and `--card-background-muted`.
4. **Inputs and drop zones:** 1 px `--border-strong`, `--radius-control`; on focus `--accent` border plus a 3 px ring of `--focus-ring` at 30%.
5. **Errors:** `--danger` text on `--danger-bg`.
6. **Focus:** `outline: 2px solid var(--focus-ring); outline-offset: 2px` on `:focus-visible`.
7. **Icons:** 20 px outline icons, stroke `currentColor`, stroke-width 2, round caps and joins, from an inline SVG sprite.
8. A "Skip to content" link that appears on focus, styled like the Support my work page.

**Site header** — copy the markup and CSS of the Support my work header:

1. Grid `brand | nav | toggle`, minimum height 72 px, `--card-background`, 1 px bottom border, inside the 960 px container.
2. Brand: links to `https://u77w41.github.io/`; 44 px round avatar (copy `assets/avatar.png` from the Support my work site into `public/assets/`); name "Ujjwal Chowdhury" (17 px, 700, `--accent`); tagline "Data Scientist | AI Researcher | Building for Bharat" (13 px, `--text-muted`).
3. Nav links, each with an icon: Hire Me → `https://u77w41.github.io/resume/`; Anurup → `https://u77w41.github.io/anurup/`; **Support my work** → `https://u77w41.github.io/support-my-work/`.
4. Theme toggle: 40 px round button with a border; moon icon in light mode, sun icon in dark mode; `aria-label` and `title` say "Switch to dark mode" or "Switch to light mode".
5. Under 768 px, nav links become 40 px round icon-only buttons with `aria-label`s; the Support my work button stays visible.

**Support my work links** (top and bottom, as on Anurup)

1. **Top:** the header nav item — icon plus the text "Support my work" on desktop, icon-only on mobile.
2. **Bottom:** its own line in the footer — bold, colour `--accent`, icon plus the text "Support my work", underline on hover.
3. Both open in a new tab with `target="_blank" rel="noreferrer"` and show the tooltip/title "Support my work: send a small tip over UPI".
4. Icon: an outline hand-holding-heart (a heart above two open hands), stroke-width 1.5. On hover the heart fills with `--danger`.
5. No pop-ups, modals or tracking parameters on these links.
6. Test IDs: `support-link` (header, desktop), `support-link-mobile` (header, mobile), `support-link-footer`.

**Site footer** — mirrors the Support my work footer: 14 px, line-height 1.75, padding 8 px top and 40 px bottom, inside the 960 px container.

1. Footer links: Hire Me · Anurup · Source on GitHub (this tool's repository).
2. "Everything runs in your browser. Your files are never uploaded."
3. The Support my work link (above).
4. Copyright: "© \<launch year> – \<current year> Ujjwal Chowdhury", weight 700, colour `--accent`; the current year is computed at runtime.

**Page metadata:** `meta author` and `og:site_name` = "Ujjwal Chowdhury"; title format "\<Product name> · Ujjwal Chowdhury"; `twitter:card` = `summary`; canonical URL `https://u77w41.github.io/<repo>/`.

**Acceptance:** Playwright confirms both Support my work links exist with the correct URL, `target="_blank"` and `rel="noreferrer"`, in both themes and at desktop and mobile widths. With `localStorage.StackColorScheme = "dark"` set before load, the page renders dark with no flash of the light theme. After deployment, check by hand that choosing dark mode on the Support my work page carries over to this tool (CI cannot test this, because it runs on a different origin).

## Error handling, limits and security

Every failure shows a plain-language message with a next step; the page never goes blank.

| Condition | Detection | Behaviour |
| --- | --- | --- |
| Binary file | A null byte in the first 8 KB | "This looks like a binary file and can't be compared as text." |
| Invalid UTF-8 | `TextDecoder` with `fatal: true` throws | Decode with replacement characters and show "This file isn't valid UTF-8; unreadable characters are shown as �." |
| Invalid notebook JSON | `JSON.parse` fails | Show the error with line and column, plus a "Compare as plain text instead" button |
| nbformat below 4 | `nbformat` field < 4 | "Only nbformat 4 notebooks are supported" + plain-text fallback button |
| Notebook vs. non-notebook | Detected modes differ | Warning banner, then a text diff of both inputs |
| Large input | Over 5 MB on either side | Warning: "Large file — the diff may take a few seconds"; proceed |
| Too large | Over 50 MB on either side | Refuse with `TOO_LARGE` and explain the limit |
| Large single output | Output data over 1 MB | Collapse behind a click-to-load control |
| Slow diff | Over 10 s | Show a Cancel button that terminates and respawns the worker (`CANCELLED`); suggest switching off character-level highlighting |
| Worker crash | Worker `error` event | Inputs under 1 MB: retry on the main thread. Otherwise: error banner with a Retry button |
| UI exception | `<svelte:boundary>` | Error card with "Reload" and "Report an issue" (`https://github.com/U77w41/diff-checker/issues`) |
| URL fetch fails | Network or CORS error | "This site doesn't allow loading from other pages. Download the file and upload it instead." |
| Share link too long | Compressed payload over 8 KB | Disable link; offer bundle download |
| Corrupt share link | Decompression or JSON parse fails | "This share link is damaged" and open an empty comparison |
| Storage unavailable | localStorage throws | Settings apply for this visit only; no error shown |

**Security rules**

1. Never use `innerHTML` with unsanitised content. Markdown and HTML outputs always pass through DOMPurify.
2. `text/html` outputs render inside `<iframe sandbox>` with no `allow-scripts` and no `allow-same-origin`, using `srcdoc`.
3. Never execute `application/javascript` or widget outputs.
4. Content-Security-Policy in a meta tag: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; frame-src 'self' blob: data:; object-src 'none'; base-uri 'self'`. Adjust only if a phase genuinely needs it, and record why.
5. Images are rendered only from `data:` URLs built from the notebook's own base64 data, never from remote URLs inside the notebook.
6. Self-host all fonts and libraries in the build; load nothing from CDNs at runtime.

## Testing and CI/CD

Every pull request must pass lint, unit, property, end-to-end and bundle-size checks; only `main` deploys to GitHub Pages.

**Test layers**

1. **Unit tests (Vitest)** for every `src/core/` module, aiming for ≥ 90% line coverage there. Required cases:
   - Each ignore option on and off; CRLF vs LF; byte-order mark; empty inputs; identical inputs.
   - Word and character intra-line spans.
   - Cell matching: insert, delete, modify, reorder (moved), split one cell into two, merge two cells into one, code→markdown type change, notebooks with and without cell IDs, one notebook empty.
   - Each output type in the output diff table; noisy-metadata hiding; execution-count hiding.
2. **Golden fixtures** in `tests/fixtures/notebooks/`: at least 6 real-world pairs — pandas DataFrame tables, matplotlib plots, an error traceback, a widget output, large outputs, and a heavily reordered notebook. Snapshot the `NotebookDiffResult` (with base64 data replaced by its hash) and review snapshot changes by hand.
3. **Property tests (fast-check)**
   - Applying a `TextDiffResult` to A reproduces B exactly (all ignore options off).
   - Every A cell appears in exactly one op as `a`, and every B cell exactly once as `b`.
   - Diffing X against itself always returns `identical: true` / all `unchanged`.
4. **Performance tests** in `tests/perf/`: a generated 10,000-line text pair and a 500-cell notebook pair with images must each finish in under 1 s in Node. Fail CI if exceeded by more than 50%.
5. **End-to-end tests (Playwright)** on Chromium, Firefox and WebKit, plus a 390 × 844 mobile viewport:
   - Paste two texts and see the correct counts; toggle views and options.
   - Upload a notebook pair; outline navigation works; filters hide outputs.
   - Share link round trip reproduces the same diff.
   - Invalid JSON shows the error and the plain-text fallback works.
6. **Security tests:** fixture notebooks containing `<script>`, `onerror=` attributes and `javascript:` links in markdown and HTML outputs. The test fails if any script runs (listen for a global flag set by the payload).
7. **Accessibility:** run axe-core inside the Playwright tests; zero serious or critical violations.

**CI workflow (`.github/workflows/ci.yml`)** — on every pull request and push:

1. Check out, set up Node (current LTS), `npm ci`.
2. `npm run lint` and `npm run typecheck`.
3. `npm run test` (unit, property, golden) with coverage.
4. `npm run test:perf`.
5. `npm run build`, then `npx size-limit` with a 250 KB gzipped budget for initial JS.
6. `npx playwright install --with-deps` and `npm run test:e2e` against `vite preview`.

**Deploy workflow (`.github/workflows/deploy.yml`)** — on push to `main` only. Job `checks` runs the same steps as `ci.yml`; job `deploy` has `needs: checks`, so nothing is published unless every check passes:

1. Permissions: `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages` with `cancel-in-progress: false`; environment `github-pages`.
2. Build with `npm ci && npm run build`.
3. Use the official `actions/configure-pages`, `actions/upload-pages-artifact` (path `dist`) and `actions/deploy-pages` actions, at their current major versions.
4. In the repository settings, Pages source = "GitHub Actions".

## Global constraints

Every task in every phase must also satisfy these, with the exact values given.

1. Hosting: static files on GitHub Pages at `https://u77w41.github.io/diff-checker/`; no server; no third-party requests at runtime.
2. Toolchain: Vite 8, Svelte 5, TypeScript 6.x (`strict`), Vitest 5, Playwright; exact versions pinned, each at least 14 days old when installed.
3. `src/core/` is pure TypeScript with no DOM access; all diffing runs in the worker.
4. Performance: initial JS ≤ 250 KB gzipped; a 10,000-line text diff and a 500-cell notebook diff each finish in under 1 s.
5. Security: the CSP in Error handling, limits and security; no inline scripts; all HTML sanitised; notebook JavaScript and widgets never run.
6. Styling: colours only from the theme tokens; scheme on `data-scheme`; theme stored under `StackColorScheme`.
7. Branding: the site header and footer from Visual design and branding, with Support my work links in both, on every view.
8. Privacy: inputs are never stored unless "Remember inputs on this device" is on.
9. UI copy: use the quoted strings in this spec word for word.

## Review focus

These five inputs are the most likely to break the tool for real users; each gets the listed test in the phase that owns the code.

| # | Input or condition | Expected behaviour | Test and owning phase |
| --- | --- | --- | --- |
| 1 | A file that isn't valid UTF-8 (e.g. Windows-1252) | Shown with � replacement characters and a warning, never a blank page | Unit test of the decode helper + e2e upload — Phase 2 |
| 2 | Emoji and accented text in character mode | Highlights never split a character | Unit: `diffChars` spans for `a😀b` vs `a😁b` cover exactly one code point each side — Phase 1 |
| 3 | A minified file: 2 MB on one line | Diff completes, intra-line highlighting is skipped, the page stays responsive | Perf: one 2 MB line vs the same line with one character changed, under 2 s — Phase 1; e2e responsiveness — Phase 6 |
| 4 | Notebooks from other tools: string `source`, missing `outputs` or `metadata`, markdown attachments, duplicated cell IDs | Parsed with defaults; attachments render; duplicate IDs ignored | Golden fixture pair `nonstandard.ipynb` — Phase 3 |
| 5 | Short one-line cells edited slightly, e.g. `df.plot()` → `df.plot(kind="bar")` | Shown as modified, not deleted + added | Unit tests with the similarity reference values — Phase 3 |

## Implementation plan

The build runs in 7 phases; each ends with a working, deployed site and a phase report.

### Phase 0 — Scaffold and deploy

- [ ] Create the Vite + Svelte 5 + TypeScript project with the folder structure above; `strict: true`.
- [ ] Add ESLint, Prettier, Vitest, Playwright, size-limit and svelte-check (TypeScript 6.x); add npm scripts `lint`, `typecheck`, `test`, `test:perf`, `test:e2e`, `build`, `preview`.
- [ ] Set Vite `base` to `/<repo>/`; add `public/.nojekyll`, the CSP meta tag, title, description and Open Graph tags.
- [ ] Build the branded shell from Visual design and branding: theme tokens, self-hosted Lato, `theme-init.js` and toggle, site header and footer, and both Support my work links.
- [ ] Add `ci.yml` and `deploy.yml`.
- [ ] Add MIT `LICENSE` and a README stub.

**Acceptance:** a placeholder page with the branded header and footer, working theme toggle and both Support my work links loads at `https://<user>.github.io/<repo>/`; CI is green.

### Phase 1 — Text diff core

- [ ] `core/hash.ts` (FNV-1a) with tests.
- [ ] `core/text-diff/normalise.ts`: each ignore option, with tests first.
- [ ] `core/text-diff/diff.ts`: line diff mapped back to original lines, hunks with 3 lines of context, intra-line spans, stats.
- [ ] Property tests and the 10,000-line performance test.

**Acceptance:** all text-diff unit and property tests pass; performance under 1 s.

### Phase 2 — Worker and text view

- [ ] `worker/diff.worker.ts` exposing `diffText` via Comlink; cancel by terminate-and-respawn.
- [ ] Input panel: paste, upload, drag-and-drop, swap, clear, file names, binary detection, BOM stripping.
- [ ] `ui/text-view`: CodeMirror merge view fed by the worker's character changes through diffConfig.override, side-by-side/unified, syntax highlighting by extension, collapsed unchanged regions, scrollbar markers.
- [ ] Toolbar: ignore options, granularity, previous/next, counter, stats; auto-run with 300 ms debounce.
- [ ] Export: copy and download `diff.patch`.

**Acceptance:** two Python files diff correctly in all three browsers; the patch applies cleanly with `git apply`.

### Phase 3 — Notebook core

- [ ] `core/detect.ts` and `core/nb-parse` with validation errors.
- [ ] `core/nb-align`: the four matching passes and output ordering.
- [ ] `core/nb-diff`: source, output and metadata diffs; header changes.
- [ ] Golden fixtures (≥ 6 pairs) and notebook property tests.
- [ ] Expose `diffNotebook` from the worker; cache parsed notebooks.
- [ ] 500-cell performance test.

**Acceptance:** all notebook tests and snapshots pass; performance under 1 s.

### Phase 4 — Notebook view and renderers

- [ ] `ui/nb-view`: cell cards with badges, collapsible Source/Outputs/Metadata, collapsed unchanged runs, outline sidebar.
- [ ] Filters: hide outputs, hide metadata, show unchanged, similarity slider.
- [ ] Renderers: markdown (marked + DOMPurify), KaTeX (lazy-loaded), image comparison (side-by-side, swipe, onion-skin), sandboxed HTML, ANSI-stripped tracebacks, unsupported-output placeholder, large-output click-to-load.
- [ ] Security test fixtures.

**Acceptance:** the example notebook pair shows a moved cell, a modified plot with all three image modes, and an error diff; no security test payload executes.

### Phase 5 — App features and polish

- [ ] Hash router (`#text`, `#notebook`, `#s=`).
- [ ] Share links with the visibility warning, 8 KB limit and bundle download/open.
- [ ] "Try an example" with bundled pairs.
- [ ] Settings in localStorage; opt-in "Remember inputs".
- [ ] Dark-mode styling of the diff and notebook views, keyboard shortcuts and help dialog, mobile layout, ARIA live region.
- [ ] Optional "Load from URL" with the CORS error message.
- [ ] PWA app-shell caching.

**Acceptance:** a share link reproduces the same diff in another browser; the site works offline after first load; mobile layout matches the UI spec.

### Phase 6 — Hardening and launch

- [ ] Implement every row of the error handling table.
- [ ] Full Playwright suite, including mobile viewport and axe-core.
- [ ] Lazy-load KaTeX and image comparison so the initial bundle meets the 250 KB budget.
- [ ] Lighthouse mobile performance ≥ 90.
- [ ] README with screenshots, feature list, privacy statement, local development steps and contribution guide; issue templates.

**Acceptance:** all success criteria in Product overview are met and CI is green on `main`.

## Out of scope (v2 backlog)

These are deliberately excluded from v1; do not build them or add hooks for them.

1. Three-way merge, or editing and accepting changes hunk by hunk.
2. Semantic JSON/YAML diff that ignores key order.
3. Comparing a notebook with a `.py` script (jupytext percent format).
4. Comparing GitHub commits or pull requests through the GitHub API.
5. Folder or multi-file diff, including zip uploads.
6. Accounts, saved history, server-side share links, analytics.
7. Running notebook code or rendering interactive widgets.

## Definition of done and kickoff prompt

The project is done when all success criteria are met, every phase's acceptance criteria pass, and the site is live on GitHub Pages with CI green.

**Definition of done, per phase**

- [ ] All tasks in the phase are complete and its acceptance criterion is demonstrated.
- [ ] Lint, typecheck and all tests pass locally and in CI.
- [ ] No new console errors or warnings in the browser.
- [ ] The deployed site on GitHub Pages reflects the phase.
- [ ] A phase report is delivered (format in How to use this document).

**Kickoff prompt** — paste this to the chatbot together with this whole document:

```text
You are building a public, browser-only diff checker for text/scripts and Jupyter notebooks, hosted on GitHub Pages. The attached document is the complete specification.

Rules:
- Follow the spec exactly. Do not add features from "Out of scope".
- Build one phase at a time, starting with Phase 0. Use test-driven development for everything in src/core/.
- After each phase, stop and give me the phase report: what was built, how to run it, test results, assumptions, open questions. Wait for my "continue" before the next phase.
- When the spec is ambiguous, choose the simplest option consistent with it and list it under Assumptions.
- Give complete file contents for every file you create or change, with its path.

The GitHub repository name is: diff-checker
My GitHub username is: U77w41 (site: https://u77w41.github.io/diff-checker/)

If you have the superpowers skills, first use superpowers:writing-plans to turn the current phase into a step-by-step TDD plan, then execute it with superpowers:subagent-driven-development or superpowers:executing-plans.

Start with Phase 0.
```

## Validation log

The spec was checked on 31 Oct 2026 against the real packages, a prototype and the live sites; nothing has been built or run in a browser yet.

| Check | How | Result |
| --- | --- | --- |
| Library APIs | Installed the packages and read their exports and type definitions | jsdiff 9 has `diffLines`, `diffWordsWithSpace`, `diffChars`, `createTwoFilesPatch`. `@codemirror/merge` 6.12 has `MergeView`, `unifiedMergeView`, `goToNextChunk`/`goToPreviousChunk`, `collapseUnchanged` and `diffConfig.override`. Svelte 5 has `<svelte:boundary>`; vite-plugin-pwa 2 has `injectRegister: 'script'`; `@fontsource/lato` ships 300/400/700 |
| Toolchain compatibility | Read peer dependencies on npm | `svelte-check` 4.7 needs TypeScript 5 or 6 while the latest is 7.0 → TypeScript 6.x. Vite 8 works with vite-plugin-svelte 7, Vitest 5 and vite-plugin-pwa 2 |
| Bundle budget | esbuild bundle of CodeMirror + merge + Svelte runtime + Comlink + lz-string | About 108 KB gzipped before app code, so 250 KB is achievable if languages load on demand |
| Text diff speed | jsdiff `diffLines` on a generated 10,000-line pair in Node | 75 ms |
| Unicode | `diffChars` on `a😀b` vs `a😁b` | Splits by code point, not UTF-16 unit |
| Patch export | `createTwoFilesPatch` output run through `git apply --check` | Same-name headers apply; different names fail → spec uses A's name for both |
| Cell matching | Prototype of the four passes on 8 cases (identical, insert, modify, reorder, type change, split, one side empty, duplicates) | Expected ops in every case. Line-based similarity scored one-line edits 0 → replaced with the token Dice score (2,500 pairs in 95 ms) |
| Branding | Read the live Support my work HTML, CSS and JS and the Anurup bundle | Tokens, header, footer, theme key `StackColorScheme`, support link text, tooltip and icon copied from the live sites |
