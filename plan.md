# plan.md — non-destructive UI/UX redesign plan

## Block A — Header

- **Project:** `ai-learning-studio` (Learning Studio) — Next.js 16.2.6 App Router, React 19.2.6, Tailwind v4.1.17 (CSS-first `@theme`), Drizzle/SQLite
- **Date:** 2026-09-22
- **Chosen archetype:** **Refine the existing *editorial* direction** — *why:* the audit found a mature, deliberate editorial identity (warm serif display type, three tokenized palettes light/dark/editorial, full primitive token layer, WCAG 2.2 AA geometry). The redesign deepens that voice — consistent icon craft, in-design dialog/toast surfaces, one token-owned type scale — instead of discarding it. (Recorded from `qna-plan.md`.)
- **Mode:** **Q&A-driven** (`qna-plan.md` present — no best-result assumptions made).
- **Design work (from `qna-plan.md`):** all 7 audit priority candidates ①–⑦, plus presentation-only features: richer shimmer skeletons, unified micro-interaction pass, designed empty states.
- **Referenced GitHub skill (from `qna-plan.md`):** **shadcn/ui** — copy-paste reference patterns only (dialog/sheet, toast stack, `cn()`); **no runtime package dependency added** except the two class-merge utilities mandated by freeze instruction #5.

**Sources used from the 27-source matrix** (everything else is out of this plan):

| # | Source | Used in |
|---|--------|---------|
| 1 | shadcn/ui | Phases 1–3 (dialog/sheet patterns, `cn()`, component API consistency) |
| 2 | Radix Primitives | Phases 2, 5 (accessible dialog focus-trap/keyboard semantics, adapted to the hand-rolled `Popover`) |
| 3 | Motion (motion.dev) | Phase 4 (spring-physics reference values for CSS springs) |
| 5 | Magic UI | Phase 4 (micro-interaction vocabulary) |
| 6 | Emil Kowalski / animations.dev | Phase 4 (spring physics, touch feedback, subtle micro-animation craft) |
| 7 | Rauno Freiberg / Invisible Details | Phases 3–4 (optical alignment, pixel-level refinement of chrome) |
| 9 | Sonner | Phases 2–4 (stackable, spring-animated, accessible toast stack) |
| 10 | Vaul | Phases 2, 5 (mobile bottom-sheet pattern for dialogs) |
| 11 | Refactoring UI | Phases 1, 3, 4 (typography scale, depth, optical balance) |
| 12 | Steve Schoger Design Tips | Phase 3 (micro-tweaks: shadows, button padding ratios, card alignment) |
| 13 | Linear Method | Phases 1, 4 (dark-mode ramps, high-density zero-latency feedback) |
| 14 | Geist Design System | Phases 1, 3 (disciplined type/mono-numeric tokens) |
| 15 | Tailwind CSS Documentation | Phase 1 (theme tokens, variant modifiers, arbitrary-value removal) |
| 17 | tailwind-merge & clsx | Phase 1 (`cn()` helper) |
| 21 | Tremor | Phase 3 (KPI card treatment for the data tab) |
| 22 | Godly Website Showcase | Phases 3–4 (micro-interaction and dark-mode aesthetics benchmark) |
| 23 | Bento Grids | Phase 3 (KPI bento architecture) |
| 24 | W3C WAI-ARIA Authoring Practices Guide | Phases 2, 5 (modal dialog, focus trap, screen-reader semantics) |
| 26 | Lee Robinson | Phases 4–5 (loading skeletons, zero-CLS performance) |
| 27 | Josh W. Comeau | Phases 1, 3 (fluid typography, subtle feedback, CSS craft) |

> **Outside the matrix:** none. Every transformation below cites at least one matrix source.

---

## Block B — The 5 logic-freeze instructions

These are the *logic-freeze contract* that `/implement-plan` holds itself to for **every** edit. They are reproduced verbatim.

1. **Preserve every state and hook.** Every `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useContext`, and third-party hook (`useQuery`, `useForm`, `useRouter`, `useSearchParams`) keeps its exact name, dependency array, and internal logic. Change only how the output is presented.
2. **Preserve every handler and event.** Every `onClick`, `onSubmit`, `onChange`, `onKeyDown`, `onBlur`, and custom callback stays attached to its element with an unchanged signature and payload. Change only that element's appearance.
3. **Preserve every API and mutation.** Server actions, API-route requests, React Query mutations, and SWR revalidations keep identical arguments and effects.
4. **Stay inside the visual layer.** Every change comes from JSX restructure, Tailwind utility swaps, added decorative sub-elements, and accessible/motion wrappers around existing elements — never from data flow, validation, or side effects.
5. **Merge classes safely.** Any concatenated or prop-passed class string goes through `cn()` (clsx + tailwind-merge) so styles never collide.

**Frozen surface (from `ui-ux-audit.md` §4, 23 rows):** every hook, handler, effect, and API anchor in the freeze matrix — including the NDJSON stream consumers (`generate`/`ask` + rAF coalescing in `StudioApp`), `useForm`/`useWatch` controllers (`NewSession`, `ProviderCard`), onBlur/onMouseUp commit handlers (learner profile, temperature), `window.prompt`/`confirm` **call sites' surrounding handler logic** (only the prompt *surface* changes), `applyTheme`, `RevealController`/`useOffscreenPause`/`useGhostExits`, and all 13 API routes.

---

## Block C — The 5 phases

Detail of *how* each transformation is built lives in `implement-plan/TRANSFORM.md`; this plan names *what*, *where*, *from which source*, and the *definition of done*.

### Phase 1 — Foundation & design tokens

**Goal:** make the token layer own everything the later phases touch: one class-merge helper, one token-owned heading scale, overlay/sheet surface tokens for all three themes, zero arbitrary values.

**Target components (from audit):** `src/app/globals.css` (token layer §1 + component layer §3), new `src/lib/cn.ts`, `package.json` (build-layer only: add `clsx`, `tailwind-merge` — sanctioned by freeze instruction #5; no runtime/UI dependency added).

**Transformations:**
- Introduce `cn()` (clsx + tailwind-merge) at `src/lib/cn.ts` and route every concatenated/prop-passed class string in the codebase through it (audit candidates list; call sites enumerated in Phase 3). — **#17, #1**
- Replace the lone JSX arbitrary value `min-h-[5.5rem]` (`NewSession.tsx:90`) with a token/standard utility. — **#15**
- Unify the heading scale: add/consolidate semantic heading utilities on the existing `--type-h1/h2/h3` + `--leading-title`/`--tracking-title` tokens (e.g. `.title-page`, `.title-section`, `.title-card`) so raw `text-2xl sm:text-3xl font-semibold tracking-tight` / `font-serif text-3xl` / `text-lg font-medium` patterns (audit §5.1) all resolve to one token-owned scale. Apply in Phase 3. — **#11, #14, #27**
- Add overlay/sheet surface tokens (backdrop, sheet panel, dialog padding/radius per theme) to all three palettes — groundwork for Phase 2's confirm dialog + mobile bottom sheet. — **#1, #10, #13**
- Verify the dark ramp: every new token carries light/dark/editorial values; no literal colors below the token block (stylelint already enforces). — **#13, #14**

**Definition of done:** `cn()` exists and is used by every new surface; `grep` for `[` arbitrary values in `src/**/*.tsx` classNames returns zero; heading utilities defined in all three themes; `npm run typecheck` + `npm run lint:css` green; diff is tokens + one helper file + two build dependencies (no component logic touched).

### Phase 2 — Atomic components

**Goal:** build the two missing accessible primitives the audit flagged — in-design dialogs (replacing `window.prompt`/`confirm`) and a shared stacked toast — plus a consistent icon set. Presentation-only components; the existing `Popover`/`card`/`chip` language is extended, not replaced.

**Target components (from audit):** new `src/components/ui/ConfirmSheet.tsx` (confirm dialog + mobile bottom sheet), new `src/components/ui/Dialog.tsx` (modal shell with focus trap) or extension of `Popover` family, new `src/components/ui/ToastStack.tsx` (shared toast), `src/components/ui/Icon.tsx` (22 glyphs), `globals.css` §3 component classes (`.dialog`, `.sheet`, `.toast-*` extensions).

**Transformations:**
- **Dialog/sheet primitive:** modal panel using the existing `.card`/`.card-elevated` surface language + Phase-1 overlay tokens; W3C modal semantics — focus trap, Escape closes, focus returns to invoker, `role="alertdialog"`/`role="dialog"` + labelled by title; renders as a centered card ≥768px and as a **bottom sheet** below it (Vaul geometry: `inset-x-0 bottom-0 rounded-t-2xl sm:inset-auto sm:rounded-xl`, spring slide-up). A rename variant embeds the existing `.input`. — **#1, #2, #10, #24**
- **Shared toast stack:** one component (Sonner geometry: stacked column, spring entrance/exit, auto-dismiss 3.5s info / 8s error — matching current timings, swipe/pull-dismiss on touch, `role="status"` + `aria-live="polite"`, per-tone via the existing `.toast[data-tone]` tokens). Props contract: same `notify(kind, message)` shape the apps already use (adapter lives in the app shell, handlers unchanged). — **#9, #6**
- **Icon set:** uniform 16px stroke set for all 22 glyph names (consistent 1.5 stroke, shared corner radius, optical centering) under the existing `Icon` name/`className`/`aria-hidden` API — zero call-site prop changes; hand-tuned drift (settings, paperclip, study) removed. — **#1, #22**
- Reduced-motion + offscreen-pause parity for every new animation (existing §8/§9 machinery). — **#6, #26**

**Definition of done:** both primitives render correctly in all three themes; axe-core passes on dialog (focus trap, Escape, return-focus) and toast (live announcements); sheet presents as bottom sheet at ≤767px; icon set visually uniform at 16px; no call site yet rewired (that is Phase 3); diff = new components + component-layer CSS only.

### Phase 3 — Layout & domain components

**Goal:** swap the five native-dialog call sites onto the new primitives, retire the two duplicated toast layers in favor of the shared stack, and apply the low-severity presentation candidates (KPI bento, heading unification, glass polish).

**Target components (from audit):** `src/components/studio/Sidebar.tsx` (rename prompt L74, session-delete confirm L100, project-delete confirm L309), `src/components/settings/SettingsApp.tsx` (methodology-delete confirm L129; data-tab `dl` stat row ~L780; toast layer ~L801), `src/components/settings/ProviderCard.tsx` (remove confirm L236), `src/components/studio/StudioApp.tsx` (toast layer ~L470), `src/components/studio/TopBar.tsx` (template-literal classes L31/45/318/333), `src/components/studio/NewSession.tsx` (classes + Phase-1 min-h token), `src/components/studio/stage/QaThread.tsx` (ghost class concat L99), `src/components/Markdown.tsx` (className concat), `src/components/studio/stage/StageToolbar.tsx` (L87 heading), `src/components/studio/stage/StageMeta.tsx` (L44), `src/components/studio/stage/ExportBar.tsx` (L18), `src/app/page.tsx` (showcase glass).

**Transformations:**
- **① Dialog swap (all 5 sites):** each `window.prompt`/`window.confirm` is replaced by the Phase-2 primitive rendered in place; the *handler logic* (patch/delete calls, `dismiss()`, refresh, toast text) stays byte-identical in signature and payload — only the prompt surface moves. Rename → dialog with embedded `.input`; delete → confirm sheet with danger tone (`data-danger`/`text-warn` language). — **#1, #2, #10, #24**
- **② Toast unification:** both duplicated layers (`StudioApp`, `SettingsApp`) render `<ToastStack>` fed by the unchanged `notify` callbacks; per-app timers collapse into the stack's auto-dismiss (same durations). — **#9**
- **④ `cn()` pass:** every remaining concatenated/prop-passed class string (enumerated above + audit §5.4) routed through `cn()`. Zero visual delta. — **#17, #1**
- **⑤ Data-tab KPI bento:** the four raw stat blocks become a 2×2 (→4-up on sm) bento of KPI cards — mono `tabular-nums` numerals (already in use), label + value hierarchy, ring borders (`ring-1 ring-black/5 dark:ring-white/10` language), `rounded-2xl`. — **#23, #21, #14**
- **⑥ Heading unification:** apply Phase-1 `.title-*` utilities at the enumerated call sites (StageToolbar L87, StageMeta L44, ExportBar L18, QaThread Q&A heading, SettingsApp L291 + data tab, NewSession L75, error/not-found pages). — **#11, #14, #27**
- **⑦ Glass polish:** decide and apply one of — (a) move the landing showcase over the ambient glow for true translucency, or (b) drop `backdrop-filter` on `.card-elevated` where the background is opaque (the showcase); either way the editorial glass language is kept honest. — **#22, #7, #11**

**Definition of done:** `grep -r "window.prompt\|window.confirm" src/` returns **zero** hits; exactly one toast layer in the codebase; all `cn()` call sites converted; KPI bento live in Settings → Data; all headings resolve through the token scale; showcase glass decision applied; every component diff is presentation-only against the freeze matrix.

### Phase 4 — Motion, micro-interactions & feedback

**Goal:** one consistent motion vocabulary across every control, richer loading feedback, and designed empty states — all inside the existing CSS-driven, reduced-motion-safe, offscreen-paused system (no motion library added).

**Target components (from audit):** `globals.css` §7 (motion), `src/lib/motion.ts` (presentation helpers only — `RevealController`/`useOffscreenPause`/`useGhostExits` behavior unchanged), `app/loading.tsx`, `StudioApp.tsx` `StudioSkeleton`, `SettingsApp.tsx` `SettingsSkeleton`, StageDeck streaming skeleton block, `Sidebar.tsx` (empty history / no-match), `StageDeck.tsx` (sources empty, learning-state "not assessed"), `QaThread.tsx` (empty thread), `Composer.tsx`, `TopBar.tsx` (chips/pills), `.btn`/`.chip`/`.step-pill` component classes.

**Transformations:**
- **Unified micro-interaction pass:** every interactive control (`.btn`, `.chip`, `.step-pill`, `.icon-btn`, `.sidebar-item`, `.config-card`, KPI cards if made tappable) shares the existing spring vocabulary — hover lift ≤1.02 on `--ease-spring`, `active:scale-[0.98]`-class press (the `.btn` pattern extended to chips/pills), `--dur-quick`/`--dur-base` tiers only. No new durations/easings invented; only re-aim existing hand-tuned values at the shared tokens. — **#6, #5, #3, #7**
- **Loading & skeletons:** shimmer sweep on primary loading paths (landing → n/a; Studio/Settings first load + streaming stage block get the existing `.skeleton` shimmer); skeletons verified to mirror final geometry (no CLS on hydrate). — **#26, #13**
- **Designed empty states:** the five enumerated empty surfaces get a small designed placeholder — 16px icon (Phase-2 set), one editorial-voice line, optional single CTA button — replacing bare muted text; each reuses existing classes + tokens. — **#22, #11, #12**
- **Feedback polish:** toast spring entrance/exit live (from Phase 2), focus rings verified on every new surface (existing `:focus-visible` token pattern), status LED/pulse/dot unchanged. — **#9, #24**

**Definition of done:** one hover/active/press/focus vocabulary observable across all controls; shimmer present on first-load + streaming paths; the 5 empty states designed; every animation covered by the §8 reduced-motion overrides and offscreen pause; Lighthouse/CLS check on `/studio` shows zero layout shift during hydrate; no hook/effect in `lib/motion.ts` changed.

### Phase 5 — Responsive parity, accessibility & verification

**Goal:** close the loop — mobile ergonomics on every new surface, full a11y compliance in all three themes, zero-CLS, and the final zero-regression verification against the audit's freeze matrix.

**Target components (from audit):** mobile drawer (`Sidebar` panel/backdrop, `globals.css` §9), `TopBar` (wraps at narrow widths), stage rail (horizontal scroll), data-tab bento (2×2 on mobile), new dialog/sheet/toast surfaces, whole app.

**Transformations:**
- **Mobile ergonomics:** confirm dialogs present as bottom sheets ≤767px (Vaul geometry, `--target-touch` 44px handles/hit areas); toast dismiss ≥44px; KPI bento stacks to 2×2 then 1-up; stage rail + top bar wrap verified at 360px; `touch-manipulation` present on all new touch controls. — **#10, #24**
- **Accessibility (all three themes):** modal focus trap + return focus verified (W3C APG dialog pattern), toast `aria-live` announcements, contrast spot-check of muted text / chip borders in light/dark/editorial (tokens only — adjust a token, never a component, if a ratio fails), full keyboard pass: tabs → listbox → dialog → sheet Escape paths. — **#24, #2, #11**
- **Zero-CLS:** skeleton geometry matches final content at 360/768/1280; heading-swap and bento changes produce no width/height shift; `contain-intrinsic-size` thread optimization untouched. — **#26**
- **Final zero-regression pass (the gate):** re-check the whole app against the audit's 23-row freeze matrix — every frozen hook, handler, and API call intact; `npm run typecheck`, `npm run lint`, `npm run lint:css` green; `npm run build` green; Playwright + axe e2e suite passes on `/`, `/studio`, `/settings`; produce the closing report listing exactly what changed (presentation) and confirming nothing logic-related moved. — **#26, #24**

**Definition of done:** all three theme modes pass the a11y + responsive checks at 360/768/1280; build/typecheck/lint/e2e all green; freeze-matrix re-check reports zero logic deltas; the final report is appended to this plan and the app is left running with the visual upgrade live.

---

## Execution notes for `/implement-plan`

- **Run phases strictly in order 1 → 5.** Each phase's *definition of done* is a gate before the next phase starts.
- **Per edit:** name the source(s) from the matrix; keep the change inside the visual layer; route classes through `cn()`; verify against the freeze matrix.
- **Dependency changes allowed:** `clsx` + `tailwind-merge` (Phase 1, freeze instruction #5) — nothing else. shadcn/ui is a **reference** (copy-paste patterns), not an installed package.
- **Out of scope (from `qna-plan.md`):** none requested. Any need discovered during implementation that touches state/data-flow/side effects is flagged *out of scope* and excluded, never force-fit.

---

## Closing report — `/implement-plan` (2026-09-22)

**Status: all five phases complete; all gates green; app left running with the visual upgrade live.**

### What changed (presentation only)

| Area | Change | Files |
|------|--------|-------|
| Foundation | `cn()` (clsx + tailwind-merge) at every concatenated/prop-passed class string; token-owned heading scale (`.title-page/.title-section/.title-card` over `--type-page/section/card`); `--dialog-backdrop` token (3 themes); lone arbitrary value `min-h-[5.5rem]` → `min-h-20` | `src/lib/cn.ts`, `globals.css`, 9 component files, `package.json` (+`clsx`, `tailwind-merge` only) |
| Atomic | `Dialog.tsx` (W3C APG focus trap, Escape, return-focus, `role=dialog/alertdialog`), `ConfirmSheet.tsx`/`RenameSheet.tsx` (remount-on-open, empty-rename closes without saving = original `prompt` semantics), `ToastStack.tsx` (shared stack, same `notify(kind,message)` contract, per-app 8s/3.5s + 7s/3s timings), `Icon.tsx` (uniform 1.5-stroke 16px set, same names/API, +`search`/`chevronRight`) | `src/components/ui/*` |
| Domain | All 5 `window.prompt`/`window.confirm` call sites swapped to the in-design surfaces — **every swapped handler keeps the identical API call, guard/`act` wrapper, refresh and toast text** (rename→`api.patchSession`, session/project/methodology/provider delete→`api.delete*`); the two duplicated toast layers collapsed into one `ToastStack`; KPI bento on Settings → Data; heading unification at all enumerated sites; `.card-elevated` true glass (82% surface) | `Sidebar.tsx`, `SettingsApp.tsx`, `ProviderCard.tsx`, `StudioApp.tsx` |
| Motion | One press vocabulary (`.btn`/`button.chip`/`.step-pill` `:active scale(0.98)`, spring hover lifts ≤1.02); shimmer skeletons mirroring final geometry (Studio/Settings first load + streaming block); five designed empty states (QA thread, sources, learning-state "not assessed", sidebar history/no-match, + `stage.qa.empty` string); toast/sheet/dialog spring entrances | `globals.css` §7, `QaThread.tsx`, `ResourceList.tsx`, `StageDeck.tsx`, `Sidebar.tsx` |
| Responsive/a11y | Dialog/sheet: bottom sheet ≤767px (Vaul geometry, handle), centered ≥768px — probed at 360/767/768/1280; toast dismiss ≥44px on touch; `touch-action: manipulation` on every interactive primitive; footer brand `aria-label` (prohibited on generic element) → logo `alt`; settings skeleton `<main>` carries loaded-branch container classes (zero-CLS) | `globals.css`, `Dialog.tsx`, `page.tsx`, `SettingsApp.tsx` |

### Verification results (final run, prod build on :3100)

- **Playwright + axe e2e: 19 passed / 2 skipped / 0 failed.** Skips are `model-picker` ×2, self-skipping by design when <2 cached models exist (environment-dependent; identical on the original code).
- **axe-core: zero violations** on landing, settings, studio (new-session) and studio (open session); spot scans of all three themes (light/dark/editorial × landing/studio) report zero serious/critical violations.
- **Contrast spot-check (all three themes):** muted-on-surface 6.31–6.96:1, muted-on-bg 5.46–7.47:1, accent-on-surface 5.65–8.58:1, on-accent 5.65–8.75:1 — all WCAG 2.2 AA. No token needed adjustment.
- **Zero-CLS: CLS = 0.0000** on `/`, `/studio`, `/settings` at 360/768/1280 (PerformanceObserver, load+hydrate+scroll). One pre-existing shift fixed: settings skeleton `<main>` now matches the loaded container geometry (was 128px horizontal re-center at 1280px, CLS 0.0961 → 0).
- **Gates:** `npm run typecheck` ✓, `npm run lint` ✓, `npm run lint:css` ✓, `npm run build` ✓ (Node 22).
- **Visual baseline** regenerated after behavioral suites went green (`tests/visual/landing.spec.ts-snapshots/landing-chromium-linux.png`).

### Freeze-matrix re-check (23 rows)

Every hunk of the 22 changed files + 5 new files was reviewed line by line against the §4 matrix:

- All frozen hooks, effects, and handlers are present with unchanged names, dependency arrays, signatures and payloads — verified per file: `StudioApp` (12 states − the two sanctioned toast-state moves, rAF coalescing, hydration/theme effects), `Sidebar` (`act`/`handleSelect`/project form), `TopBar` (listbox roving tabindex, ArrowDown/Up signals), `NewSession` (`useForm`/`useWatch`/⌘-Enter/disable-logic), `StageDeck` (copy/nav/generate), `StageToolbar` (`handleRailKeys`), `StageMeta` (save-&-regenerate ordering), `QaThread` (`useGhostExits`), `Composer`, `AttachmentRow`, `ExportBar` (export hrefs), `SettingsApp` (`guard`, roving tabs, onBlur/mouseUp commits, hash-init tab), `ProviderCard` (`commitBaseUrl` on blur, `saveKey`), `Popover`/`Collapsible`/`ProgressBar`/`MotionGate`/`Markdown` (memo), `layout` (theme bootstrap + skip link), `theme.ts`/`motion.ts`/`api.ts` (untouched), all 13 API routes (untouched).
- **Zero logic deltas.** The only state moves are the two explicitly sanctioned by the approved candidate list: ① the five native-dialog surfaces (handler logic passed through byte-identical into `ConfirmSheet`/`RenameSheet`) and ② the toast layer consolidation (same `notify` contract and auto-dismiss durations; the inline-durations object was memoized by primitive values so `notify` identity stays stable — an un-memoized version caused an infinite hydration re-run caught in e2e and fixed in `ToastStack.tsx`).
- New presentation state is limited to overlay targets (`renameTarget`, `deleteSessionTarget`, `deleteProjectTarget`, `confirmRemove`, `confirmDelete`) and the toast stack's internal `toasts` list — no data-flow changes.
- Dependencies: `clsx` + `tailwind-merge` only (freeze instruction #5). No other runtime package added.

### Known notes

- `tests/keyboard/model-picker.spec.ts` self-skips without ≥2 cached models (no provider configured in this environment) — same behaviour on the original code.
- The win32 visual snapshot remains the original (only the linux snapshot is exercised in this environment).
- App remains running on port 3100 (prod build) with the visual upgrade live.
