# Diff Checker

A fast, free, browser-only diff checker for text, scripts and Jupyter notebooks, hosted on GitHub Pages.

**Live site:** [https://u77w41.github.io/diff-checker/](https://u77w41.github.io/diff-checker/)

## Features

- **Privacy first:** All comparisons run client-side in a Web Worker — your files and data never leave your browser.
- **Text & Code:** Line, word, and character-level diff highlighting with syntax highlighting.
- **Jupyter Notebooks (.ipynb):** Cell-aware comparison understanding source, outputs, and metadata instead of raw JSON.
- **No server:** Zero backend, zero analytics, zero cookies.

## Development

```bash
# Install dependencies
npm ci

# Start local development server
npm run dev

# Run unit tests
npm run test

# Run performance benchmark
npm run test:perf

# Typecheck and lint
npm run typecheck
npm run lint

# Build for production
npm run build
```

## Licence

[MIT](LICENSE) © 2026 Ujjwal Chowdhury
