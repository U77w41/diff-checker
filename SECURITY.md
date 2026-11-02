# Security Policy

Diff Checker runs entirely in your browser. There is no server, no account and no analytics. Your files are read, diffed and rendered on your own machine and never uploaded.

Below: how to report a problem, what the app defends against, and where it can't.

## Reporting a vulnerability

Please don't open a public issue for security bugs.

Use GitHub's private reporting instead: **Security → Report a vulnerability** on this repository. If that isn't available to you, email ujjwalchowdhury@rbihub.in with "Diff Checker security" in the subject.

Helpful things to include:

- what an attacker can do, and what the victim has to do (open a link, import a file, click something)
- steps to reproduce, ideally a share link or a small notebook
- the browser and version you tested in

I'll reply within 7 days and aim to ship a fix for anything High or Critical within 30. I'm happy to credit you in the release notes, or to leave you out if you'd rather.

## Supported versions

Only the live site at <https://u77w41.github.io/diff-checker/> and the `main` branch get fixes. The app works offline after the first visit, so an old copy can stay cached. A normal reload picks up the new version.

## How the app treats your data

| What | Where it goes |
|---|---|
| Files and pasted text | Browser memory only. Diffing happens in a Web Worker. |
| Share links | Both inputs are compressed into the part of the URL after `#`. Browsers don't send that part to any server, but it stays in your history and anywhere you paste the link. |
| "Remember inputs" | Off by default. When on, inputs are saved in plain text in this browser's `localStorage`. |
| Settings and theme | `localStorage`, no content. |
| "Load from URL" | Your browser fetches the URL directly, without cookies. Nothing passes through a server of mine. |

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
- **Limits.** Files over 50 MB are refused, and diffs that take more than 10 seconds are cancelled.
- **Pinned dependencies.** Exact versions only, each at least 14 days old before it's adopted.

## Known limits

GitHub Pages can't send custom HTTP headers, so a few protections are out of reach:

- **Framing.** The site can't stop another page from loading it in a frame. There's no login and nothing to change, so the risk is low.
- **Inline styles.** The editor needs `style-src 'unsafe-inline'`. Rendered markdown is contained in its own cell to limit what styles can do.
- **Outbound requests.** "Load from URL" needs to reach any HTTPS host, so the CSP allows that.

## Security reviews

| Date | Scope | Result |
|---|---|---|
| 2026-11-02 | Full code, dependencies and CI | Fixes in progress. Details will be published here once they ship. |
