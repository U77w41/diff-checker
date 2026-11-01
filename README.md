# Diff Checker

A fast, private, browser-only diff checker for text, scripts, and Jupyter notebooks (`.ipynb`), hosted on GitHub Pages.

**Live URL:** [https://u77w41.github.io/diff-checker/](https://u77w41.github.io/diff-checker/)

---

## Key Features

### 📄 Text & Code Comparison

- **View Modes:** Side-by-side and unified diff views.
- **Granular Highlighting:** Word-level and character-level intra-line highlighting.
- **Flexible Normalisation:** Ignore whitespace (collapse runs of spaces and tabs), ignore case differences, ignore line endings (CRLF vs LF), and ignore blank lines.
- **Syntax Highlighting:** Integrated CodeMirror 6 with syntax modes for Python, JavaScript, TypeScript, HTML, CSS, JSON, Markdown, YAML, and SQL.
- **Patch Export:** One-click copy or download of standard unified diffs (`git apply`-compatible).

### 🪐 Semantic Jupyter Notebook Diff (`.ipynb`)

- **4-Pass Cell Alignment:**
  1. _ID Anchoring:_ Longest Increasing Subsequence (LIS) matching for preserved unique cell IDs.
  2. _Exact Content LCS:_ Longest Common Subsequence of identical cells.
  3. _Greedy Similarity:_ Token-based Dice similarity matching ($\ge 0.5$ threshold).
  4. _Move Detection & Leftovers:_ Unpartnered cells identified as moved, added, or deleted.
- **Cell Cards & Navigation:** Status badges (`added`, `deleted`, `modified`, `moved`, `unchanged`), cell type badges, and sticky outline sidebar with smooth scrolling.
- **Collapsible unchanged runs:** Minimises visual noise by condensing runs of unchanged cells.
- **Specialised Output Renderers:**
  - _Images:_ Side-by-side, interactive swipe divider, and onion-skin opacity slider.
  - _HTML:_ Rendered inside secure sandboxed `<iframe>` elements (`sandbox=""`, scripts disabled) with source diff toggle.
  - _Markdown & Math:_ GitHub-flavored markdown with lazy-loaded KaTeX math expressions.
  - _Streams & Errors:_ ANSI colour-stripped tracebacks and stdout/stderr stream diffs.
  - _Large outputs:_ Outputs over 1 MB collapse behind a click-to-load control.

### 🔒 Privacy by Design

- **100% Client-Side:** Everything runs inside your browser using a dedicated Web Worker.
- **Zero Server Uploads:** Your text, code, and proprietary notebooks never leave your local device.
- **No Cookies & No Analytics:** No trackers, telemetry, third-party CDNs, or storage leaks.

### 🔗 Deep Links & Diff Bundles

- **URL Sharing:** Compresses diff state into `#s=<data>` with LZ-string.
- **Privacy Warning:** Prompts with clear privacy warning before copying.
- **8 KB Limit Enforcement:** If a comparison exceeds the 8 KB URL limit, URL sharing is safely disabled in favour of diff bundles.
- **Offline Diff Bundles:** Export and import complete comparisons as `.json` files.

### 📱 Responsive & Accessible (WCAG 2.1 AA)

- Responsive layout adapting to mobile viewports ($< 768$ px) with unified view and folded toolbar menu (`⋯`).
- Colour-blind safe add/remove palette (blue/orange) with explicit `+`/`−` markers.
- Full keyboard navigation and shortcuts modal (`?`).
- ARIA live announcements for screen readers.

### ⚡ Offline PWA Support

- Offline application shell caching via Service Worker.

---

## Keyboard Shortcuts

| Shortcut                 | Action                             |
| ------------------------ | ---------------------------------- |
| `n`                      | Go to next change chunk            |
| `p`                      | Go to previous change chunk        |
| `u`                      | Toggle unified / side-by-side view |
| `Ctrl+Enter` / `⌘+Enter` | Run comparison                     |
| `?`                      | Open keyboard shortcuts guide      |
| `Esc`                    | Close open dialog or mobile drawer |

_Note: Shortcuts are temporarily disabled while typing inside input fields or text editors._

---

## Local Development

### Prerequisites

- Node.js 22 (LTS)
- npm 10+

### Setup & Run

```bash
# Clone repository
git clone https://github.com/U77w41/diff-checker.git
cd diff-checker

# Install exact pinned dependencies
npm ci

# Start Vite development server
npm run dev
```

### Verification & Testing

```bash
# Run unit and property tests (102 tests across 19 suites)
npm test

# Run performance benchmarks (10,000-line text diff & 500-cell notebook diff)
npm run test:perf

# Run TypeScript checking and ESLint + Prettier
npm run typecheck
npm run lint

# Build production bundle with PWA service worker
npm run build

# Verify bundle size budget (≤ 250 KB initial JS)
npm run size

# Run Playwright end-to-end tests and axe-core accessibility checks
npm run test:e2e
```

---

## Contributing

Contributions, bug reports, and suggestions are welcome!

1. Check existing issues or open a new one using our [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) or [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) templates.
2. Fork the repository and create a feature branch (`git checkout -b feat/my-feature`).
3. Ensure all tests and lint checks pass (`npm run typecheck && npm run lint && npm test`).
4. Commit your changes with descriptive commit messages and submit a Pull Request.

---

## Licence & Attribution

[MIT License](LICENSE) © 2026 Ujjwal Chowdhury.

Part of the open-source suite by [Ujjwal Chowdhury](https://u77w41.github.io/). If you find this tool helpful, consider [supporting my work](https://u77w41.github.io/support-my-work/).
