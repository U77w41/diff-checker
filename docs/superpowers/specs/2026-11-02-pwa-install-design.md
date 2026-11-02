# PWA Browser Installation & In-App Install Button Design

## Intent

Enable browser-based installation of Diff Checker as a Progressive Web App (PWA) matching the experience of `https://u77w41.github.io/anurup/`, and provide an in-app "Install" button situated in the top navigation between the "Support my work" link and the light/dark mode theme toggle.

## Goals

1. **Full PWA Installability Criteria:**
   - Supply required PNG icons in `public/`:
     - `pwa-192.png` (192×192 standard icon)
     - `pwa-512.png` (512×512 standard icon)
     - `pwa-maskable-512.png` (512×512 maskable icon with safe-zone margin)
     - `apple-touch-icon.png` (180×180 iOS icon)
     - `favicon.ico` (standard fallback icon)
   - Update `vite.config.ts` PWA manifest configuration with complete metadata: `id`, `name`, `short_name`, `description`, `start_url`, `scope`, `display: 'standalone'`, `background_color`, `theme_color`, `categories`, and the full icon array with proper mime types and purposes (`any` and `maskable`).
   - Update `index.html` to reference `apple-touch-icon.png` and `favicon.ico`.

2. **In-App Install Button:**
   - Place an Install button in the header navigation, positioned to the right of "Support my work" and to the left of the theme toggle.
   - Display a suitable install SVG icon (a monitor/tray with a downward arrow) alongside the label or accessible title.
   - Maintain the Hugo "Stack" design tokens: min 44×44px touch target, WCAG 2.1 AA keyboard accessibility (`Enter`, `Space`), hover/focus states, and matching text/icon colors.
   - Listen to `beforeinstallprompt` to store the deferred prompt and display the button when the browser allows installation.
   - When clicked, invoke `prompt()` on the deferred event and await `userChoice`.
   - Listen to `appinstalled` to clear the prompt and hide the button once installed.
   - Keep hidden when already running in standalone display mode (`display-mode: standalone` or `navigator.standalone`).

3. **Testing & Quality:**
   - Maintain strict client-side isolation, zero telemetry, zero CSP violations, and stay well within the 250 KB bundle limit.
   - Add unit/E2E tests in Playwright verifying:
     - Web manifest and icons load with 200 OK and valid JSON.
     - Install button responds to the `beforeinstallprompt` event and triggers the prompt on click.
     - Header layout maintains correct ordering and responsive behavior.
   - Verify `npm run typecheck`, `npm run lint`, `npm test`, `npm run size`, and `npx playwright test`.

## Non-Goals

- Creating a custom install modal or tutorial popup for browsers that don't support `beforeinstallprompt` (e.g. desktop Firefox or iOS Safari).
- Modifying offline caching strategies or Workbox background sync.

## Anti-Goals

- Never show an unusable or dead Install button when installation is unavailable.
- Never alter existing navigation ordering other than inserting the button in the designated slot.
- Never degrade Lighthouse/axe-core accessibility scores or violate CSP policies.

## Constraints

- Pure client-side operation, no backend.
- Svelte 5 Runes (`$state`, `$effect`).
- CSS variables and tokens from `src/app/theme.css`.
- CSP compatibility: no inline scripts or unsafe styles.

## Approaches Considered

- **Approach 1 (Selected): Reactive Native Install Button with Full PWA Assets**
  - Captures `beforeinstallprompt` and `appinstalled` events.
  - Generates PNG/maskable icons and full Web App Manifest.
  - Cleanly appears between "Support my work" and theme toggle when installable, cleanly hides when installed.
- **Approach 2 (Rejected): Persistent Install Button with Instruction Modal Fallback**
  - Always visible button that opens an instruction modal on iOS or unsupported browsers.
  - Rejected to avoid UI clutter and redundant dialogs for already-installed users.

## Decisions Made

1. **Header Placement:**
   - In `src/App.svelte` and `src/app/theme.css`, the header navigation grid/flex accommodates the install button right after `Support my work` and right before `#theme-toggle`.
   - On mobile viewports, the install button collapses gracefully or remains accessible next to the theme toggle.
2. **Install Icon:**
   - An SVG icon featuring an install arrow pointing into an open tray/device base, consistent with the 1.5–2px stroke style of other header icons (`.nav-icon`).
3. **PWA Assets:**
   - Generated at exact pixel sizes based on the project's brand icon design and colors.

## Builder Details

- **Icon files to create in `public/`:** `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`.
- **Files to update:**
  - `vite.config.ts`: Manifest configuration (`icons`, `id`, `categories`).
  - `index.html`: Icon link tags.
  - `src/App.svelte`: PWA install event listener lifecycle and install button markup.
  - `src/app/theme.css`: Header layout adjustment and button styling.
  - `tests/e2e/shell.spec.ts`: E2E test assertions for PWA installability and header order.
