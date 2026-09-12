# Visual Polish & Motion — Implementation Plan

**Status:** recorded before execution (Phase 1 gate)
**Branch:** `arena/01a09772-ai-learning-assistant-specific`
**Baseline commit:** `fd863fd` (merge of PR #1)
**Scope:** presentation only — landing page + chat interface
**Skills applied:** `frontend-design`, `motion-and-animation`, `scope-dod-enforcer`, `wbs-decomposition`, `semver-release-manager`

---

## 1. Source code & surface audit

### 1.1 Component map

| Surface | File | LOC | Render kind | Role in this task |
| --- | --- | --- | --- | --- |
| Landing page | `src/app/page.tsx` | 71 | Server component, **zero state, zero handlers**, single `Link` import | **In scope** — full restyle |
| App shell / chat container | `src/components/studio/StudioApp.tsx` | 429 | Client, 12 `useState`, 9 `useCallback`, all data flow | **In scope (shell only)** — root container + toast wrapper |
| Message stream + composer | `src/components/studio/StageDeck.tsx` | 612 | Client, 5 `useState`, 2 `useRef`, 3 `useEffect`, 2 `useMemo`, prop callbacks | **In scope** — markup/class restyle |
| Session list | `src/components/studio/Sidebar.tsx` | 295 | Client | **Out of scope** except one presentational inline-style conversion (§1.4) |
| Top bar | `src/components/studio/TopBar.tsx` | 258 | Client | **Out of scope** — inherits tokens/classes via CSS |
| New-session view | `src/components/studio/NewSession.tsx` | 147 | Client | **Out of scope** — inherits tokens/classes via CSS |
| Settings workspace | `src/components/settings/SettingsApp.tsx` | 776 | Client | **Out of scope** — inherits tokens/classes via CSS |
| Markdown renderer | `src/components/Markdown.tsx` | 26 | `memo`, fixed prop contract | **Out of scope** — untouched |
| Design tokens / stylesheet | `src/app/globals.css` | 424 | CSS | **In scope** — primary change surface |
| Root layout | `src/app/layout.tsx` | 26 | Server | **Out of scope** — untouched |

### 1.2 Functional vs. presentational boundary

Identified per component, at attribute granularity:

| Layer | Examples found | Treatment |
| --- | --- | --- |
| **Functional (frozen)** | `useState`/`useRef`/`useEffect`/`useMemo`/`useCallback` calls, dependency arrays, `streamRun` callbacks, `api.*` calls, `openSession`, `generate`, `ask`, `editStep`, `upload`, `removeAttachment`, `createSession`, `patchSettings`, `patchSession`, `discover`, `notify`, `copy()`, `timeAgo()`, `act()`, `guard()`, conditional rendering expressions, `.map`/`.filter`/`.find` derivations, `event.preventDefault()`, `event.currentTarget.form?.requestSubmit()`, `disabled` predicates | **Frozen** — byte-identical |
| **Contract (frozen)** | Every `type Props` block, exported types (`RunState`, `StageRow`), component signatures, prop names and prop *order* at call sites, `Markdown`'s `{ children, className }`, `Link href` targets, `form onSubmit` bodies, `textarea`/`input`/`select` `value`+`onChange` pairs, `type="submit"` triggers | **Frozen** — byte-identical |
| **Presentational (editable)** | `className` strings, inline `style` objects, Tailwind utility lists, wrapper elements that add no behaviour, CSS custom properties, keyframes, `@media` blocks | **Editable** — this plan's change surface |

### 1.3 Explicitly frozen invariants

1. **Prop interfaces.** `StageDeck` `Props` (13 props), `TopBar` `Props` (9), `Sidebar` `Props` (8), `NewSession` `Props` (3) — names, types, optionality and order unchanged. `StudioApp` call sites pass the identical prop set.
2. **Event signatures.** `onClick`, `onSubmit`, `onChange`, `onKeyDown`, `onToggleCollapse`, `onSelect`, `onNew`, `onRefresh`, `onCreate`, `onStageIndex`, `onGenerate`, `onAsk`, `onEditStep`, `onUpload`, `onDeleteAttachment`, `onPatchSettings`, `onPatchSession`, `onDiscover` — every handler body and argument list unchanged.
3. **State hooks.** All `useState` names, initial values, setters and update semantics unchanged. No hook added, removed, reordered or memo-dependency-altered.
4. **Refs & effects.** `toastTimer`, `fileRef`, `bodyRef`, `panelRef` and all `useEffect` bodies/deps unchanged. `bodyRef` stays bound to the scroll container that `scrollTo({ top: 0 })` targets.
5. **Imports & dependencies.** No new npm dependency, no change to `package.json`, no new module import in any component. New presentational data may be added *inside* `page.tsx` only.
6. **Data flow.** `api.*` calls, SSE handling (`status`/`delta`/`reasoning`/`resources`/`error`), local-storage keys (`studio-last-session`, `studio-sidebar-collapsed`, `studio-theme`), and export URLs unchanged.
7. **Accessibility contract.** Existing `aria-label`, `title`, `role`, `disabled` attributes and heading levels preserved; additions are additive only.

### 1.4 Recorded presentational-only conversions (deliberate, listed)

| ID | File | From | To | Rationale |
| --- | --- | --- | --- | --- |
| C1 | `StageDeck.tsx` | Inline `style={{ borderColor/background/color }}` on step pills & index dots | `data-active` / `data-generated` attributes + CSS rules with **identical computed token values** | Hover/focus states need cascade control; inline styles cannot be overridden |
| C2 | `StageDeck.tsx` | Inline `style={{ color: tone === "accent" ? … : … }}` in `Collapsible` | `data-tone` attribute + CSS | Same reason as C1 |
| C3 | `StageDeck.tsx`, `Sidebar.tsx` | Progress bars animating `width` % | `transform: scaleX(value)` with the **same computed ratio**, `transform-origin: left` | DoD: animations must be transform/opacity only |
| C4 | `StudioApp.tsx` | Toast card `fixed left-1/2 -translate-x-1/2` **and** `animate-rise` (keyframe overwrites the centring transform) | Centring moved to an outer wrapper; animation runs on the inner card | Fixes a pre-existing transform collision; a layout wrapper, no behaviour change |

No other inline-style or attribute beyond `className`/`style`/`data-*` is touched in any component.

---

## 2. Deliverable roadmap (WBS)

| ID | Work package | Output artifact | Evidence of done |
| --- | --- | --- | --- |
| **WP-0** | Planning & invariant audit | this document + `/tmp` baseline SHA-1 manifest of all 49 tracked source files | Plan committed **before** any style edit |
| **WP-1** | Design token layer | `globals.css` §Tokens: palette per theme, 8pt spacing scale, radii, elevation, motion curves/durations, type scale | Contrast script output: every text pair ≥ 4.5:1 (AA) |
| **WP-2** | Landing page architecture | `page.tsx`: ambient canvas, glass nav, editorial hero, 6-stage workflow visual, pillar cards, facts grid, closing CTA, footer | `next build` clean, HTML snapshot shows all 7 sections |
| **WP-3** | Chat container & message stream | `StageDeck.tsx` + `StudioApp.tsx`: header metadata band, thread area, role-differentiated bubbles, grounded composer | Prop/handler diff = ∅ |
| **WP-4** | Motion choreography | Keyframes `heroRise`, `riseIn`, `messageIn`, `dotPulse`, `caretBlink`, `shimmerSweep`, `pulseSoft`; stagger delays; hover lifts; reduced-motion block | All keyframes animate only `opacity`/`transform`; `grep` proof + build clean |
| **WP-5** | Verification & integrity pass | automated diffs, `tsc --noEmit`, `eslint`, `next build`, live preview | Zero logic-file diffs, all four gates green |
| **WP-6** | Release documentation | `CHANGELOG.md` (Keep a Changelog 1.1.0, SemVer) + README pointer | Changelog sections Added/Changed/Fixed with a documented version decision |

100% rule check: WP-1…WP-4 cover every file in §1.1's in-scope set; WP-5 is the only verification package; no file is owned by two packages.

---

## 3. Implementation checkpoints

- **CP-1 (tokens):** contrast script over all theme × surface × text-token pairs returns ≥ 4.5:1; no token name removed (only new tokens added), so no existing class breaks.
- **CP-2 (landing):** every `<Link href>` target, the `pillars` and `facts` data arrays, and the "Enter the Studio →" / "Configure providers" labels survive byte-identical in copy and target.
- **CP-3 (chat):** `git diff` over `StageDeck.tsx` touches only `className`, `style`→`data-*` conversions C1–C3, and added wrapper elements; prop list and every handler body identical.
- **CP-4 (motion):** no keyframe or `transition` references a layout property (`width`, `height`, `margin`, `padding`, `top/left`, `gap`); the only non-transform/opacity animation is the decorative shimmer, implemented as a `translateX` sweep on a pseudo-element.
- **CP-5 (integrity):** `git diff --stat` shows zero changes under `src/lib/`, `src/db/`, `src/app/api/`, `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`.
- **CP-6 (release):** `CHANGELOG.md` exists, is ordered newest-first, and its version decision (baseline `0.1.0` → `0.2.0`, MINOR: backward-compatible visual feature work, no API change) is justified in-line.

---

## 4. Definition of Done

| Criterion | Verification method |
| --- | --- |
| Zero functional mutation | baseline SHA-1 manifest vs. working tree for all non-presentational files; structural diff of handler/hook lines in edited components |
| Visual polish & hierarchy | token-driven type scale, 8pt rhythm, translucent 1px borders, elevation tiers |
| WCAG 2.2 AA contrast | automated ratio script over the full token matrix (≥ 4.5:1 text, ≥ 3:1 large/UI) |
| Layout-safe motion | keyframe property allow-list: `opacity`, `transform` only; no CLS sources (no animated `width`/`height`/`margin`/`inset`) |
| Reduced-motion compliance | `@media (prefers-reduced-motion: reduce)` disables every animation and restores the settled state (`opacity: 1; transform: none`), plus a global transition-duration clamp |
| Audit-ready documentation | this plan + `CHANGELOG.md` |

## 5. Risk register (pre-mortem, brief)

| Risk | Mitigation |
| --- | --- |
| Hover `scale(1.02)` on full-width buttons causes horizontal overflow in the 288px sidebar | Scale applies to `.btn:not(.w-full)`; full-width buttons get elevation + colour only |
| Translucent surfaces reduce text contrast | Text always sits on opaque `--surface`/`--surface2`; glass is used for chrome bars only, and every text pair is machine-checked |
| Reveal animations leave elements invisible if CSS is blocked | Animations use `both` fill on decorative wrappers; reduced-motion block forces the settled state |
| Restructuring the composer breaks ⌘/Ctrl+↵ submit | Composer markup keeps `<textarea>` and submit button inside the same `<form>`; `requestSubmit()` path verified by diff |
| Step-pill inline-style → attribute conversion changes appearance | Token mapping table recorded in the changelog; values are literally the same CSS variables |

---

## 6. Verification results (post-execution appendix)

Recorded after execution. Sections 1–5 above were frozen before any style edit; this appendix is the
evidence package for CP-1…CP-6.

### 6.1 Contrast — CP-1

Script: `/tmp/audit/contrast.mjs`, parsing the token blocks out of `src/app/globals.css`.

| Palette | Pairs audited | Below 4.5:1 |
| --- | --- | --- |
| Baseline (pre-change) | 45 | **11** — worst: editorial accent on `surface2` 3.62:1, editorial accent on bg 3.89:1, editorial good/warn on bg ≈4.0:1, light accent on accent-soft 4.23:1 |
| After | 48 | **0** — lowest is editorial accent on `surface2` at 4.68:1 |

The hero gradient headline spans `--accent` → `--accent-bright`, which is decorative large-format type
(≥ 44px, AA large-text floor 3:1); measured endpoints are 5.12:1 and 3.39:1 in the default theme.

### 6.2 Motion safety — CP-4

Parsed from the compiled stylesheet (`.next/static/chunks/*.css`, 50 KB minified):

- 8 keyframes — `heroRise`, `riseIn`, `messageIn`, `pulseDot`, `pulseSoft`, `caretBlink`, `shimmerSweep`,
  `growX` — every declared property is `opacity` or `transform`. **0 failures.**
- Every `transition` / `transition-property` declaration targets non-layout properties. **0 failures.**
- One `@media (prefers-reduced-motion: reduce)` block that disables animation, restores settled states for
  hidden-start elements, and exempts state-encoding transforms (progress ratios) from being reset.

### 6.3 Zero functional mutation — CP-3 / CP-5

Script: `/tmp/audit/integrity.mjs` (presentational attributes stripped, then compared line-by-line).

- **Hooks:** identical `useState/useRef/useEffect/useMemo/useCallback` sets in every edited component.
- **Handlers:** identical set of `on*` handler expressions (arguments and bodies included).
- **Prop signatures:** identical in every edited `.tsx` type block.
- **Frozen surface:** all **38** non-presentational files (`src/lib/**`, `src/db/**`, `src/app/api/**`,
  `src/components/settings/**`, `Markdown.tsx`, `TopBar.tsx`, `NewSession.tsx`, `layout.tsx`,
  `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`,
  `drizzle.config.json`) are **byte-identical** to the baseline commit by `git hash-object`.
- `package-lock.json` was restored to its baseline content after `npm install` rewrote platform metadata.
- Residual non-class diffs in the five edited files are exactly the recorded C1–C4 conversions plus added
  layout wrappers, decorative elements and copy.

### 6.4 Build, lint and runtime gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | pass, no output |
| `npm run build` | pass — 17 routes, static `/` prerendered, no warnings |
| `npm run lint` | 4 findings — **byte-identical to the baseline worktree run** (2 × `react-hooks/set-state-in-effect`, 2 × parse errors in `test_*.mjs`); 0 new |
| `/`, `/studio`, `/settings`, `/api/health` | HTTP 200 |
| End-to-end API flow | session created → all 6 stages generated (1367–1514 chars each) → status `completed` → 2 Q&A turns persisted → `export?format=md` returns 10 585 chars of clean Markdown with no prompt/provider leakage |
| Dead CSS | 0 custom classes defined but unreferenced (3 removed during the pass) |

### 6.5 Environment limitation

The sandbox has no browser runtime (`chromium`/`google-chrome` absent; the Playwright browser download is
blocked), so no screenshot-based visual regression was possible. Verification is therefore structural and
script-based, complemented by a live production build served at `http://0.0.0.0:3000`
(`/`, `/studio`, `/settings`).
