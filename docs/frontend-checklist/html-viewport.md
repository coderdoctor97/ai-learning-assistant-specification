# Frontend Checklist — responsive viewport

Rule: [html/viewport — Set the responsive viewport meta tag](https://frontendchecklist.io/rules/html/viewport)
(critical per the task brief). Researched and verified on 2026-09-23.

## Sources and exact rule wording

The Content Checklist MCP `tools/list` JSON-RPC POST to
`https://mcp.frontendchecklist.io` failed with `curl: (35) ... SSL_ERROR_SYSCALL`.
**Fallback:** the public rule page and related public pages were fetched instead.
No MCP tool list or rule response is claimed. Repository inspection, contents API,
code/repository searches, and PR operations use the available `git`/`gh` tools,
not the requested GitHub MCP. The default branch is `main`.

The page does not have a formal pass/fail table. Relevant wording, verbatim:

> The viewport meta tag is essential for responsive web design, controlling how web pages are displayed on mobile devices.

> Add the viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0"> in the head section.

> ❌ **Don't Disable Zooming**: Harms accessibility

> ❌ **Don't Omit**: Missing viewport tag breaks mobile experience

> **Don't disable zooming**: Users with visual impairments need zoom functionality

The good example, verbatim:

```html
<!-- Good - allows accessibility zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

The rule's verification list, verbatim (link annotations omitted):

- **Chrome DevTools**: Device simulation mode
- **Firefox DevTools**: Responsive design mode
- **Mobile-Friendly Test**: Google's Mobile-Friendly Test
- **Real Device Testing**: Always test on actual devices

Related pages inspected:

- [html/charset](https://frontendchecklist.io/rules/html/charset): early UTF-8 declaration, first head meta.
- [html/doctype](https://frontendchecklist.io/rules/html/doctype): HTML5 doctype before the document.
- [html/lang-attribute](https://frontendchecklist.io/rules/html/lang-attribute): root language declaration.
- [html/favicons](https://frontendchecklist.io/rules/html/favicons): device-specific head contents (initial section).
- [css/viewport-zoom](https://frontendchecklist.io/rules/css/viewport-zoom): reject `user-scalable` values `no`/`0` and `maximum-scale` below 2; inspect CSS zoom restrictions too.
- [css/horizontal-scroll](https://frontendchecklist.io/rules/css/horizontal-scroll): avoid page overflow at responsive widths.
- [accessibility/touch-targets](https://frontendchecklist.io/rules/accessibility/touch-targets): 24px AA minimum, 44px practical target (through verification section).

The zoom rule says, verbatim:

> The viewport meta tag controls how mobile browsers scale a page. Disabling zoom in this tag is a common but serious accessibility failure that prevents low-vision users from reading content.

> 3. Test at least one mobile and one desktop viewport before shipping.

The viewport page's restrictive “advanced” examples conflict with its own accessibility
advice and the related zoom rule; do not copy them. Its `metadata.viewport` App Router
example also predates the current Next.js API. Preserve the supported `viewport` export.
Research-only verbatim bad examples are kept in session working notes, not deployable fixtures.

## Repository findings and implementation

This is a **Next.js 16.2.6 App Router / React 19 / TypeScript application**, not a
spec-only repository. It already has Playwright, ESLint, Stylelint, and a Node charset checker.
There is no static root `index.html`, Pages Router document, or second root layout.

The two full-document producers were already correct:

1. `src/app/layout.tsx` exports `viewport: Viewport` with `width: "device-width"`
   and `initialScale: 1`. Next emits the tag after charset for `/`, `/studio`,
   `/settings`, and the shared not-found page. Preserve theme-color metadata.
2. `src/lib/export/document.ts` emits the same tag immediately after charset in
   `toHtml()`, shared by HTML downloads, printable HTML, and ZIP HTML output.

**Before → after: unchanged**, exactly one canonical declaration per document:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

`1` and the checklist example's `1.0` are equivalent. Do not add a manual JSX tag.
There were no restrictive zoom directives to remove. CSS uses safe-area insets,
but that does not require opting into `viewport-fit=cover`; retain the standard viewport.

The browser check found a separate direct cause of viewport mismatch: the Settings
tagline's non-wrapping chip extended to 388px at a 375px device width. Adding
`max-w-full whitespace-normal` to **that chip only** fixes it without hiding overflow.
No other layout or component behavior is changed.

## Project pass/fail contract and tests

The task's stricter project contract supplements (rather than misquotes) the rule:
exactly one lowercase viewport name, nonempty content, explicit head placement,
device width, initial scale 1, and **only those two directives**. Reject fixed widths,
zoom restrictions, minimum scale, legacy shrink-to-fit, duplicates, and unexpected extras.

- `tests/support/viewport.ts`: parse5 parses raw served HTML with source offsets;
  misplaced tags cannot pass merely because a browser repairs the DOM. Inert
  script/comment/template examples do not count as declarations.
- `tests/html/viewport.spec.ts`: positive/negative parser cases, four served routes
  (including 404 with status checks), plus HTML and printable exports from a completed
  demo session. The fixture session is deleted in `finally`. ZIP uses the same renderer.
- `tests/responsive/viewport.spec.ts`: all four routes at 375×812 and 768×812 with
  mobile/touch emulation, plus 1440×812 desktop layout. Checks the exact DOM meta,
  head placement, device/inner/client width equality, and horizontal overflow.
- `package.json`: `npm run test:viewport`, also included in the existing `test:e2e` suite.
- The existing workflow **template** includes viewport checks. It is still not an active
  `.github/workflows` pipeline; repository notes report the previous automation token
  lacked workflow-write permission. No new workflow permission claim is made here.

Use an isolated test database with the default offline demo provider, as with the
existing browser suite. Maintain `VIEWPORT_ROUTES` when new page entry points are added.

```sh
npm ci
npm run build
npm run test:charset
npm run test:viewport -- --workers=2
npm run lint
npm run lint:css
npm run typecheck
```

Playwright starts a dev server if port 3100 is unused. To test production as in this
verification, first run `npm run start -- --hostname 0.0.0.0 --port 3100` separately;
Playwright reuses it. Browser-facing app requests remain same-origin.

## GitHub prior art

- [Vite React template](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react/index.html)
  has device width and initial scale 1.0 (retrieved via contents API after search returned no hits).
- [Next.js viewport fixture](https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/metadata/app/viewport/page.tsx)
  uses `generateViewport`; no need to regress to the checklist's old metadata API example.
- [axe-core rule](https://github.com/dequelabs/axe-core/blob/develop/lib/rules/meta-viewport.json)
  and [unit tests](https://github.com/dequelabs/axe-core/blob/develop/test/checks/mobile/meta-viewport-scale.js)
  check restricted scaling with negative HTML fixtures. Our exact-two-directive contract is stricter.
- GitHub `filename:SKILL.md` search found general viewport guidance, such as
  [pixel2motion](https://github.com/nolangz/pixel2motion/blob/main/SKILL.md), not a focused
  reusable meta-tag skill. No third-party skill was imported. `gh search code` is absent
  in the installed CLI; `gh api search/code` worked.

## Verification results and limitations

Actual output excerpts:

```text
$ npm run test:viewport -- --workers=2
43 passed (16.2s)
/settings @ 375: {"inner":375,"client":375,"scroll":375}
/settings @ 768: {"inner":768,"client":768,"scroll":768}
/settings @ 1440: {"inner":1440,"client":1440,"scroll":1440}

$ npm run build
✓ Compiled successfully in 14.8s
✓ Generating static pages using 1 worker (6/6) in 287ms

$ npm run test:charset
# tests 13
# pass 13
# fail 0
Charset check passed (3 documents).

$ npx playwright test tests/html/charset.spec.ts --workers=2
5 passed (1.9s)

$ npm run test:e2e -- --workers=2
3 failed
2 skipped
4 did not run
60 passed (59.4s)
```

- `npm run lint`, `npm run lint:css`, and `npm run typecheck` exited 0.
- The full-suite failures were Studio skip-link focus, session-menu focus, and landing
  screenshot baseline (1280×2239 expected versus 1280×2176 received). A focused single-worker
  rerun passed session-menu but still failed skip-link and the screenshot. No baselines
  were replaced or assertions relaxed. Thus **the full suite is not green**.
- Standard Chromium download failed with `ECONNRESET` from the Playwright CDN.
  The bundled browser initially crashed/produced zero-size text because its fontconfig
  searches `/tmp/fonts`. For this sandbox only, copied the extracted Open Sans fonts and
  installed DejaVu fonts into that directory. No browser-support code was changed.
- `html-validate@10` default recommended rules reported `190 errors` across four raw
  responses, predominantly React serialization conventions. With the recommended preset
  retained, disabling only `attr-case`, `void-style`, `attribute-boolean-style`, and
  `attribute-empty-style`, plus `valid-id: ["error", {"relaxed": true}]`, leaves **one error**:
  the pre-existing Settings loading `<div aria-label>` (`aria-label-misuse`).
  This is present at the base commit and outside this fix. Full-document validation fails.
- The same React-aware validator passed all four **rendered head extracts** (wrapped
  in an HTML5 document with an empty body), exit 0. This is head validation, not a claim
  that the entire application passes an HTML validator.
- Repository search for restrictive `user-scalable` and initial-scale-capping
  `maximum-scale` assignments found no matches (grep exit 1). Negative test values
  are assembled in memory, not stored as zoom-blocking HTML fixtures.
- No physical device pinch gesture, Firefox, Safari, or assistive-technology manual test
  was performed. Chromium emulation and directive assertions do not replace those checks.
