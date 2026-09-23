# Frontend Checklist — `html/doctype`: Use the HTML5 doctype

- **Rule:** <https://frontendchecklist.io/rules/html/doctype>
- **Category / priority:** HTML · critical (per the task brief; the rule page itself does not show a priority label)
- **MCP source:** unverified (MCP unreachable). Both MCP endpoints returned a TLS
  `SSL_ERROR_SYSCALL` for `tools/list` twice on 2026-09-23. The rule text below **was**
  independently retrieved verbatim from the public rule page on 2026-09-23.
  Repository inspection, code searches, and PR operations used `git`/`gh` as fallback.
  GitHub code search succeeded for this repo and returned zero tracked `.html` files.

## Rule text (verbatim)

> **Rule Details** — The HTML5 doctype declaration must be the very first line of every HTML
> document. It switches browsers into standards-compliant rendering mode.

> **Why It Matters**
> - **Box Model**: In Quirks Mode, `width` and `height` include padding and border (like the old IE box model), breaking CSS layouts.
> - **CSS Features**: Many modern CSS properties behave differently or are ignored in Quirks Mode.
> - **JavaScript APIs**: Some DOM APIs behave differently in Quirks Mode.
> - **Validation**: HTML5 documents without the doctype fail W3C validation.

Rendering modes, verbatim from the rule page:

| Mode | Triggered by | Behavior |
| --- | --- | --- |
| Standards Mode | `<!DOCTYPE html>` present | CSS/HTML behaves per W3C specifications |
| Almost Standards Mode | Some HTML4 doctypes | Minor table rendering quirks |
| Quirks Mode | Missing or unrecognized doctype | Emulates IE5/Netscape 4 behavior |

> **Framework Notes** — Most modern frameworks handle the doctype automatically: … **Next.js**:
> Included automatically in the rendered HTML output … Always verify in the **rendered HTML
> source** (browser: View Source), not just the template file, as SSR configurations can
> sometimes omit or move elements.

The page's Check prompt, verbatim:

> Check the very first line of the HTML document source (not the DOM — the raw HTTP response).
> The document must begin with `<!DOCTYPE html>` (case-insensitive). Flag if: (1) the doctype
> is missing entirely; (2) an old HTML4 or XHTML doctype is used (contains PUBLIC and a DTD
> URL); (3) the doctype is not the absolute first content (whitespace or BOM before it
> triggers some browsers to enter Quirks Mode); (4) the doctype has incorrect syntax.

The page's Fix prompt, verbatim:

> Add `<!DOCTYPE html>` as the absolute first line of the HTML document, before the `<html>`
> tag. Remove any old HTML4 or XHTML doctypes. Ensure no whitespace, comments, or BOM markers
> precede the doctype. For framework projects: verify in the root HTML template file, and
> confirm in the rendered HTML by viewing page source in the browser.

Standards cited by the page: HTML Living Standard — The DOCTYPE; MDN — DOCTYPE; MDN — Quirks
Mode and Standards Mode. Sibling rules already implemented in this repo:
[`html/charset`](../frontend-checklist/html-charset.md) and
[`html/viewport`](../frontend-checklist/html-viewport.md);
`html/lang-attribute` is satisfied by `lang="en"` on the root element in `src/app/layout.tsx`.

**Related pages fetched directly:** `html/doctype`, `html/charset`, `html/viewport`,
`html/lang-attribute`, and all rules listed as related on the doctype page:
`html/unique-id`, `html/404-page`, `html/direction-attribute`,
`accessibility/list-structure`. The slugs in the task
`html/lang`, `html/meta-charset`, `html/meta-viewport`, `html/title`,
`html/valid-html`, `html/validate`, and `html/semantic-markup` return 404 on the public site.
The template follows the available lang, charset, and viewport guidance without adding
unrelated changes to the app.

**Prior art (GitHub code search, then files inspected):**

- `vitejs/vite` → `packages/create-vite/template-vanilla/index.html`: doctype at byte 0,
  followed by `<html lang>`, early charset, viewport, and title. Borrowed the document
  structure, but retained this repo's uppercase `DOCTYPE` convention (Vite uses lowercase).
- `apache/camel-website` → `.htmlvalidate.json`: configures `doctype-style`, demonstrating
  the existing linter option. We did **not** add `html-validate` to this repo (not an existing
  dependency); the zero-dependency checker enforces byte-0 policy, which a style rule alone
  would not enforce. If a markup linter is adopted later, add `doctype-html` and
  `doctype-style: ["error", {"style":"uppercase"}]` alongside this checker.
- This repo's `tests/html/charset.spec.ts` checks raw HTTP bytes independently of browser
  DOM behaviour. The doctype tests borrow that pattern and add a `compatMode` assertion.

Other GitHub searches (`check-doctype`, `compatMode CSS1Compat`, `frontendchecklist`,
`html boilerplate template`) returned mostly unrelated code; the code-search API then hit
its per-installation rate limit. The repo-specific searches for `DOCTYPE` and
`extension:html` succeeded and returned zero hits — **not** a permission error.

## Pass criteria (repo policy — stricter than the standard where noted)

- The literal first content of the file/response is `<!DOCTYPE html>`. The HTML5 grammar is
  case-insensitive (`<!doctype html>` is valid and the checker accepts it), but **this repo
  standardises on uppercase `DOCTYPE`** (cf. `html-validate`'s `doctype-style: uppercase`
  default).
- No UTF-8 BOM (`EF BB BF`) precedes it — the doctype starts at **byte 0**; the file is saved
  as UTF-8 **without BOM** (enforced for editors by `.editorconfig` `charset = utf-8`).
- No XML declaration (`<?xml ... ?>`) precedes it.
- No legacy doctype: `<!DOCTYPE html PUBLIC ...>` / `<!DOCTYPE html SYSTEM ...>`
  (HTML 4.01, XHTML 1.0 transitional-or-strict DTDs).
- No HTML comment before it — tolerated by modern HTML5 parsers, but a known quirks-mode
  trigger in legacy IE and in some tooling; treated as a violation here.
- Leading blank lines/whitespace are a violation for this repo's policy, even though the
  HTML5 tokenizer ignores them (the rule page's own check prompt flags them too).
- Exactly one doctype per document.

### Pass example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page Title</title>
  </head>
  <body>
    <!-- content -->
  </body>
</html>
```

(`templates/index.html` is the canonical copy-paste starting point, using the same structure
and a generic `Document title`.)

### Fail examples

```html
<!-- ❌ missing doctype -->
<html lang="en">
<head>
  <title>Page Title</title>
</head>
```

```html
<!-- ❌ old XHTML 1.0 doctype -->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
```

```html
<!-- ❌ HTML 4.01 Strict doctype -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
  "http://www.w3.org/TR/html4/strict.dtd">
```

```html
<!-- ❌ anything before the doctype: blank line, comment, BOM, <?xml ?> -->

<!DOCTYPE html>
```

## Why it matters

Without a doctype, browsers enter **quirks mode**; legacy doctypes can trigger quirks or
almost-standards mode depending on the DTD. Quirks mode changes box-model sizing
(`width`/`height` include padding and border), line-height handling,
percentage-height resolution, float clearing, and table font inheritance — producing layout
bugs that are hard to diagnose. The runtime proof is `document.compatMode`: `"CSS1Compat"`
means standards mode, `"BackCompat"` means quirks mode.

## How this project satisfies it

This is a Next.js 16 **App Router** app. There is no hand-written `index.html` in source
(`git ls-files '*.html'` is empty); the framework always emits `<!DOCTYPE html>` as the very
first bytes of every rendered document, with no newline before `<html>`:

```html
<!DOCTYPE html><html lang="en" data-theme="editorial"><head><meta charSet="utf-8"/>…
```

Do **not** try to add a doctype in `src/app/layout.tsx` — the App Router root layout is JSX
inside `<html>`; there is nothing above it to write to. Any future static HTML page or
non-Next template must start from `templates/index.html`.

## Enforcement

| Layer | What it checks |
|---|---|
| `scripts/doctype-rule.mjs` | Shared pure checker (one document's bytes → list of problems). |
| `scripts/check-doctype.test.mjs` | `node:test` unit tests (pass forms + every anti-pattern above). |
| `scripts/check-doctype.mjs [paths|url]` | CLI. Walks template files and, if present, the prerendered `.next/server/app/*.html`; URLs check the raw served bytes. |
| `tests/html/doctype.spec.ts` | Playwright: raw served bytes for `/`, `/studio`, `/settings`, a 404 — plus `document.compatMode === "CSS1Compat"` on each route. For the large home page only, block subresources in the browser mode test (the full page crashes the bundled headless Chromium in this sandbox); the server's HTML response bytes are unchanged and checked separately. |
| `docs/frontend-checklist/doctype.workflow.yml` | **CI pending activation** — copy to `.github/workflows/doctype.yml` once the GitHub App is granted `workflows` permission: unit + seeded negative tests → `next build` → file check → Playwright raw-response + standards-mode check. The draft is not an active GitHub Actions workflow. |
| `.editorconfig` | `charset = utf-8` (not `utf-8-bom`) so editors don't reintroduce a BOM. |

## Verification

```bash
npm run test:doctype        # unit + negative tests + static check (run `npm run build` first for prerendered HTML)
npx playwright test tests/html/doctype.spec.ts   # served bytes + standards-mode runtime assertion
```

Runtime assertion in the browser console: `document.compatMode === "CSS1Compat"` must be `true`.
