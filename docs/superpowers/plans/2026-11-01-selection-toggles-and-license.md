# Implementation Plan: Selection Toggles Styling & License Update

Update the mode toggle buttons so active selections are visually highlighted, and replace the repository license with the user's source-available copyright notice.

## Proposed Changes

### 1. Design Tokens & Mode Tab Styling

- **Files**: `src/app/theme.css`, `src/App.svelte`, `src/ui/nb-view/renderers/ImageDiff.svelte`
- Add missing theme tokens in `theme.css`:
  - `--primary: var(--accent);`
  - `--primary-contrast: var(--accent-text);`
  - `--surface: var(--card-background);`
  - `--radius-sm: var(--radius-tag);`
  - `--font-size-xs: 0.8125rem;`
- Update `.tab-btn.active` in `src/App.svelte` and `.mode-btn.active` in `src/ui/nb-view/renderers/ImageDiff.svelte` so the active tab has clear visual distinction:
  - Background: `var(--accent)` (`#34495e` in light, `#2c3e50` / contrast in dark)
  - Color: `var(--accent-text)` (`#ffffff`)
  - Border and focus ring for accessibility

### 2. License & Copyright Update

- **File**: `LICENSE`

  - Replace MIT license text with:

    ```
    Copyright (c) 2026 Ujjwal Chowdhury. All rights reserved.

    This source code is made publicly available for demonstration, portfolio,
    and testing purposes only.

    No license, grant, or permission is given to copy, modify, distribute,
    re-host, or commercially exploit this software or its source code,
    in whole or in part, without prior written permission from the copyright holder.
    ```

- **File**: `README.md`
  - Update the "Licence & Attribution" section to reflect the custom source-available license terms, writing naturally with humanizer principles.

## Verification Plan

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. Commit and push changes, monitoring the GitHub Actions deployment workflow.
