# Security Policy

Diff Checker runs entirely in your browser. There is no server, no account and no analytics. Your files are read, diffed and rendered on your own machine and never uploaded.

Below: how to report a problem, what the app defends against, and where it can't.

## Reporting a vulnerability

Please don't open a public issue for security bugs.

Use GitHub's private reporting instead: **Security → Report a vulnerability** on this repository. If that isn't available to you, email u77w41+diffchecker@gmail.com with "Diff Checker security" in the subject.

Helpful things to include:

- what an attacker can do, and what the victim has to do (open a link, import a file, click something)
- steps to reproduce, ideally a share link or a small notebook
- the browser and version you tested in

I'll reply within 7 days and aim to ship a fix for anything High or Critical within 30. I'm happy to credit you in the release notes, or to leave you out if you'd rather.

## Supported versions

Only the live site at <https://u77w41.github.io/diff-checker/> and the `main` branch get fixes. The app works offline after the first visit, so an old copy can stay cached. A normal reload picks up the new version.

## How the app treats your data

| What                  | Where it goes                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files and pasted text | Browser memory only. Diffing happens in a Web Worker.                                                                                                                     |
| Share links           | Both inputs are compressed into the part of the URL after `#`. Browsers don't send that part to any server, but it stays in your history and anywhere you paste the link. |
| "Remember inputs"     | Off by default. When on, inputs are saved in plain text in this browser's `localStorage`.                                                                                 |
| Settings and theme    | `localStorage`, no content.                                                                                                                                               |
| "Load from URL"       | Your browser fetches the URL directly, without cookies. Nothing passes through a server of mine.                                                                          |

## What's in scope

- anything that runs script on the `u77w41.github.io` origin (XSS, a sanitizer bypass, a CSP bypass)
- a share link, notebook or bundle that can draw over the app, imitate its UI, or send data anywhere
- a crafted input that freezes or crashes the tab, beyond what its size would explain
- a patch export that writes outside the file it names
- anything that leaks your inputs off the device
- weaknesses in the build and deploy pipeline (dependencies, GitHub Actions)

## Built-in defences

- **Content Security Policy.** Scripts load only from this site. No inline scripts, no `eval`, no plugins.
- **Sanitised markdown.** Notebook markdown passes through DOMPurify before it reaches the page.
- **Sandboxed HTML outputs.** Notebook HTML outputs render in an `<iframe sandbox="">` with no script, form or navigation rights.
- **No remote images.** The CSP only allows images from this site or embedded `data:` URLs, so a notebook can't use one as a tracking pixel.
- **Limits.** Files over 50 MB are refused. Diffs run in a background worker, so a slow one is cancelled instead of freezing the page.
- **Pinned dependencies.** Exact versions only, each at least 14 days old before it's adopted.

## Known limits

GitHub Pages can't send custom HTTP headers, so a few protections are out of reach:

- **Framing.** The site can't stop another page from loading it in a frame. There's no login and nothing to change, so the risk is low.
- **Inline styles.** The editor needs `style-src 'unsafe-inline'`. Rendered markdown is contained in its own cell to limit what styles can do.
- **Outbound requests.** "Load from URL" needs to reach any HTTPS host, so the CSP allows that.

## Security reviews

| Date       | Scope                          | Result                         |
| ---------- | ------------------------------ | ------------------------------ |
| 2026-11-02 | Full code, dependencies and CI | 10 findings fixed, 1 accepted. |

### 2026-11-02 review

The worst issue was in share links. Markdown in a shared notebook could draw a fake sign-in form over the whole page and send whatever you typed to another site. No script was needed, so the CSP didn't stop it. It's fixed in three layers: form controls and page-level positioning are stripped from markdown, each rendered cell is now paint-contained so nothing can escape it, and the CSP blocks form submissions outright.

Also fixed:

- DOMPurify upgraded from 3.2.4 to 3.4.17, which clears seven published advisories.
- The sanitizer now fails closed. If it can't load, markdown shows as plain text.
- Markdown links open in a new tab, and element `id`/`name` values are prefixed so they can't clobber page globals.
- Share links and diff bundles are size-capped before and after decompression, and their options and file names are checked.
- Patch exports turn file names like `../../.bashrc` into safe relative paths.
- "Load from URL" is HTTPS-only, sends no cookies or referrer, and stops reading after 50 MB.
- CI jobs get only the permissions they need, actions are pinned to commit SHAs, runtime dependencies are audited on every build, and Dependabot is on.
- The share dialog and "Remember inputs" option now say where your data ends up.

Accepted: framing by other sites, since GitHub Pages can't send the header that blocks it. The broad `connect-src https:` that "Load from URL" needs also stays. Both are covered under [Known limits](#known-limits).
