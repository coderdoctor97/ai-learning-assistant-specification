# Frontend Checklist — `html/charset`: Declare UTF-8 character encoding

- **Rule:** <https://frontendchecklist.io/rules/html/charset>
- **Category / priority:** HTML · critical (per the task brief; the rule page itself does not show a priority label)
- **Summary line (from the related-rules cards on the checklist site):** "The charset (UTF-8) is declared correctly as the first element in the head."
- **Source:** retrieved on 2026-09-23 from the rule web page. The MCP server
  (`https://mcp.frontendchecklist.io`) answered its GET discovery document, but JSON-RPC
  `POST` calls failed the TLS handshake from the build sandbox, so `get_rule` could not be called.

## Rule text (verbatim)

> **Rule Details** — The UTF-8 character set must be declared early in the HTML head to ensure proper
> character rendering across all languages and symbols.
>
> **Why It Matters**
> - **International Support**: Enables proper display of all Unicode characters
> - **Security**: Prevents character encoding attacks
> - **Early Declaration**: Must be within first 1024 bytes of document
> - **Consistency**: Ensures same rendering across all browsers and platforms
>
> **Best Practices** — ✅ **Position Early**: Place as first meta tag · ✅ **Use UTF-8**: Universal
> character support · ❌ **Avoid Old Syntax**: Don't use verbose XHTML syntax
> (`<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">`)
>
> **Fix prompt** — Add `<meta charset="UTF-8">` as the first meta tag in the head section of the HTML document.
>
> **Check prompt** — Verify that this HTML document declares UTF-8 character encoding in the head section
> and that it's positioned early in the document.

Related rules: `html/viewport`, `html/lang-attribute`, `html/favicons` (and `html/doctype`, which
requires `<!DOCTYPE html>` as the very first line with no BOM before it).

## How this project satisfies it

This is a Next.js 16 **App Router** app. There is no hand-written `index.html`; the only root document is
`src/app/layout.tsx`, whose `<head>` is JSX. Next.js always injects `<meta charSet="utf-8"/>` itself as the
**first** element of `<head>` (`createViewportElements()` in `next/dist/lib/metadata/metadata.js`), followed
by the viewport meta built from the `viewport` export. Rendered output:

```html
<!DOCTYPE html><html lang="en" data-theme="editorial"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>…
```

and every HTML response is served with `Content-Type: text/html; charset=utf-8`.

**Do not add `<meta charSet="utf-8" />` to `layout.tsx`.** Next.js does not de-duplicate it: doing so
produces two charset declarations in the rendered HTML (verified with `next build`), which violates
"exactly one". The `themeBootstrap` `<script>` in `layout.tsx` is emitted *after* the framework's metas, so
it does not displace the charset.

If a static HTML page or a non-Next template is ever added, it must follow the canonical form:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>…</title>
  </head>
```

## Anti-patterns (all rejected by the checker)

- More than one charset declaration, or any charset other than `utf-8`.
- Legacy `<meta http-equiv="Content-Type" content="text/html; charset=utf-8">`, alone or alongside the short form.
- Anything before the charset meta inside `<head>` — `<title>`, viewport, `<link>`, `<script>`, or a comment.
- The charset meta ending beyond byte 1024 of the document.
- A UTF-8 BOM at the start of the file.
- Using `charset` on `<script>`/`<link>` as a substitute (irrelevant to this rule).

## Enforcement

| Layer | What it checks |
|---|---|
| `scripts/charset-rule.mjs` | Shared pure checker (one document's bytes → list of problems). |
| `scripts/check-charset.test.mjs` | `node:test` unit tests for the checker (pass + every anti-pattern). |
| `scripts/check-charset.mjs [paths|urls]` | CLI. Walks template files and, if present, the prerendered `.next/server/app/*.html`; URLs also check the `Content-Type` header. |
| `tests/html/charset.spec.ts` | Playwright: raw served bytes + header for `/`, `/studio`, `/settings`, a 404, and `document.characterSet === "UTF-8"`. |
| `docs/frontend-checklist/frontend-checklist.workflow.yml` | CI (**pending activation** — copy to `.github/workflows/frontend-checklist.yml`): unit tests → `next build` → file check → served-response check. |

Locally: `npm run build && npm run test:charset`, or `npx playwright test tests/html`.
