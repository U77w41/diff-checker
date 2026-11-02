# Diff Checker

Diff Checker is a client-side comparison tool for text files, source code, and Jupyter notebooks (`.ipynb`), hosted on GitHub Pages.

**Live site:** [https://u77w41.github.io/diff-checker/](https://u77w41.github.io/diff-checker/)

All comparison logic runs locally in your browser inside a Web Worker. Your files and inputs are never sent to a server.

---

## Features

### Text and Code Comparison

- Side-by-side and unified diff views with word-level and character-level change highlighting.
- Normalisation controls to ignore whitespace differences, letter case, CRLF/LF line endings, or blank lines.
- Syntax highlighting powered by CodeMirror 6 for Python, JavaScript, TypeScript, HTML, CSS, JSON, Markdown, YAML, and SQL.
- Export git-compatible patch files (`git apply`) directly to the clipboard or as a file download.

### Jupyter Notebook Diffing (`.ipynb`)

Rather than comparing raw notebook JSON as plain text, Diff Checker parses notebook cells and runs a four-pass alignment algorithm:

1. **ID Anchoring:** Matches cells that share unique cell IDs using a Longest Increasing Subsequence (LIS) algorithm.
2. **Exact Matching:** Matches identical cells across versions using Longest Common Subsequence (LCS).
3. **Similarity Matching:** Pairs modified cells using token bigram Dice similarity (threshold $\ge 0.5$).
4. **Move and Change Classification:** Identifies moved, added, deleted, and unchanged cells.

Additional notebook features include:

- Cell cards with status badges (`added`, `deleted`, `modified`, `moved`, `unchanged`) and execution counts.
- Sticky outline sidebar to jump between changed cells.
- Runs of unchanged cells collapse by default to reduce scrolling.
- Dedicated output renderers for notebook outputs:
  - Images: side-by-side view, swipe divider, and onion-skin opacity slider.
  - HTML: rendered in an isolated sandbox (`iframe` without script execution) with source diff fallback.
  - Markdown and Math: rendered markdown with lazy-loaded KaTeX formula rendering.
  - Console streams and tracebacks: stdout and stderr comparisons with ANSI color escape codes stripped.
  - Large outputs exceeding 1 MB are collapsed behind a click-to-load placeholder.

### Privacy and Local Execution

- Computation happens in the browser via a dedicated Web Worker using Comlink.
- Files never leave your machine; the app contains no backend, tracking scripts, or analytics cookies.
- Settings and comparison inputs are kept in memory unless you enable local storage persistence.
- Found a security problem? See [SECURITY.md](SECURITY.md) for how to report it privately.

### Sharing and Export

- URL sharing compresses diff state into the hash fragment (`#s=...`) using LZ-string compression.
- Links exceeding 8 KB are blocked from URL sharing to prevent browser truncation.
- Offline bundle export lets you save and load complete diff comparisons as `.json` files.

### Accessibility and Responsive Design

- Adapts to mobile screens below 768 px by switching to unified view and tucking secondary actions into a menu.
- Blue and orange colour scheme tested for colour-blind contrast, paired with explicit `+` and `−` symbols.
- Full keyboard navigation with screen reader live announcements for diff stats.
- Progressive Web App (PWA) service worker caches application assets for offline use.

---

## Keyboard Shortcuts

| Shortcut                 | Action                                       |
| ------------------------ | -------------------------------------------- |
| `n` / `p`                | Next or previous change chunk                |
| `j` / `k`                | Next or previous notebook cell               |
| `u`                      | Toggle between unified and side-by-side view |
| `Ctrl+Enter` / `⌘+Enter` | Run comparison                               |
| `?`                      | Open keyboard shortcuts help                 |
| `Esc`                    | Close open dialog or sidebar drawer          |

Shortcuts are paused when typing inside an input field or code editor.

---

## Development

### Prerequisites

- Node.js 22 (LTS)
- npm 10+

### Setup

```bash
git clone https://github.com/U77w41/diff-checker.git
cd diff-checker
npm ci
npm run dev
```

### Checks and Tests

```bash
# Unit, property, and fixture tests
npm test

# Benchmark runs (10,000-line text diff and 500-cell notebook)
npm run test:perf

# Typecheck and linting
npm run typecheck
npm run lint

# Production build and bundle size verification
npm run build
npm run size

# End-to-end and accessibility tests
npm run test:e2e
```

---

## License

Copyright (c) 2026 Ujjwal Chowdhury. All rights reserved.

This source code is made publicly available for demonstration, portfolio, and testing purposes only.

No license, grant, or permission is given to copy, modify, distribute, re-host, or commercially exploit this software or its source code, in whole or in part, without prior written permission from the copyright holder.

---

## Author

Created by [Ujjwal Chowdhury](https://u77w41.github.io/). If you find this project helpful, you can [support my work](https://u77w41.github.io/support-my-work/).
