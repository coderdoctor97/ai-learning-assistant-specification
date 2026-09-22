# UI/UX Audit Dossier — Learning Studio

- **Project:** `ai-learning-studio` (Learning Studio) — local-first, model-independent AI learning engine
- **Repo:** https://github.com/coderdoctor97/ai-learning-assistant-specification (cloned 2026-09-22, commit `main`)
- **Audited by:** `audit-ui-ux` skill (read-only) — no application code was changed
- **Handoff:** this dossier is the exact input to `/plan-redesign`

---

## 1. Project metadata (environment & configuration discovery)

| Fact | Value | Evidence |
|------|-------|----------|
| Next.js | **16.2.6** | `package.json` |
| Router | **App Router** (`src/app`, `force-dynamic` pages) | `src/app/*/page.tsx` |
| React / React DOM | **19.2.6** | `package.json` |
| TypeScript | 5.9.3, `strict: true`, bundler resolution, `@/*` → `./src/*` | `tsconfig.json` |
| Bundler | Next.js built-in (`next dev` / `next build`) | `package.json` scripts |
| Styling foundation | **Tailwind CSS v4.1.17** (CSS-first: `@import "tailwindcss"` + `@theme inline`; **no** `tailwind.config.*`) via `@tailwindcss/postcss` | `src/app/globals.css`, `postcss.config.mjs` |
| Custom tokens | Full primitive layer: 3 palettes (light/dark/**editorial** via `data-theme`), fluid type scale (`clamp()`), 8pt spacing scale, radii scale, motion vocabulary (durations/easings incl. spring), a11y geometry (`--target-min: 24px`, `--target-touch: 44px`), semantic state tokens, `prefers-contrast` + `forced-colors` + `prefers-reduced-motion` handling | `globals.css` §1–2, §8 |
| Fonts | System stacks only: sans (`ui-sans-serif, system-ui…`), serif (`Iowan Old Style, Palatino…` — the editorial voice), mono (`ui-monospace, SF Mono…`) | `globals.css` §1 |
| clsx / tailwind-merge / cva | **None installed.** Class composition is template literals / string concat | `package.json`, grep of `src/**` |
| UI primitives | **No UI kit.** Hand-rolled compound primitives: `Popover` (Root/Trigger/Content, outside-click, Escape, focus restore, menu/listbox key handling), `Collapsible` (ARIA disclosure), `ProgressBar`/`MiniProgressBar` (`--progress` custom property, no inline style attr), `MotionGate` | `src/components/ui/*` |
| Icons | **No icon library.** Custom inline-SVG `Icon` component, 22 stroke glyphs, 16×16, `currentColor` | `src/components/ui/Icon.tsx` |
| Motion | **No motion library.** CSS keyframes (opacity/transform only) + IntersectionObserver helpers: `RevealController` (scroll reveals), `useOffscreenPause` (pauses infinite loops offscreen), `useGhostExits` (exit-ghost diffing); 220ms theme cross-fade | `src/lib/motion.ts`, `globals.css` §7 |
| Toast/feedback | **No toast library.** Single custom toast per app (timer-based, non-stacking) in `StudioApp` and `SettingsApp` | both files |
| Forms | **react-hook-form 7.88** + `@hookform/resolvers` 5.9 + **zod 4.6** (NewSession form; ProviderCard credential form) | `package.json`, components |
| Data layer | drizzle-orm 0.45.2 + drizzle-kit, SQLite (`.data/studio.db`); `marked`/`mammoth`/`jszip`/`docx`/`unpdf` for study export | `src/db/*`, `package.json` |
| QA | Playwright + `@axe-core/playwright` (a11y e2e), stylelint (+ recess/standard), eslint-config-next | `playwright.config.ts`, `stylelint.config.mjs` |

## 2. Design-system status

- **Token architecture:** excellent. Single source of truth in `globals.css` §1; component classes consume tokens only (stylelint-enforced `color-no-hex` outside the palette block). Semantic color utilities exist via `@theme inline` (`bg-bg`, `bg-surface`, `border-line`, `text-ink`, `text-muted`, `bg-accent`, `text-warn`, `opacity-disabled`, `text-small`/`text-micro`…).
- **Palettes:** light, dark, **editorial (default)**. Theme is `data-theme` on `<html>` set pre-paint by an inline bootstrap script (no flash); persisted to `localStorage["studio-theme"]`; switcher in `TopBar` (radiogroup).
- **Type:** dual system coexists — (a) the semantic token scale (`--type-display…--type-nano`, exposed as `text-body`/`text-small`/`text-micro` utilities and `.label`/`.lede` classes) and (b) raw Tailwind scale utilities in JSX (`text-2xl sm:text-3xl font-semibold tracking-tight`, `font-serif text-3xl`, `text-lg font-medium`). Consistent in practice, but two vocabularies.
- **Spacing:** 8pt rhythm with 4px half-steps (`--space-*` tokens; JSX uses standard Tailwind spacing incl. `.5` half-steps).
- **Elevation:** 3-level tokenized shadows, inked (non-black) in dark mode; layered semi-transparent borders.
- **Motion:** fully vocabulary-driven, reduced-motion safe, offscreen-paused; zero layout-shifting animations (opacity/transform only).
- **Dark mode:** supported via `data-theme="dark"` (not Tailwind `dark:` variant) — 100% token coverage.

## 3. Codebase topology & component hierarchy

### Route map (App Router, `src/app`)

| Route | File | Type |
|-------|------|------|
| `/` (landing) | `app/page.tsx` | RSC |
| `/studio` | `app/studio/page.tsx` → `StudioApp` | thin RSC wrapper → Client |
| `/settings` | `app/settings/page.tsx` → `SettingsApp` | thin RSC wrapper → Client |
| `error.tsx` | `app/error.tsx` | Client (global error boundary) |
| `loading.tsx` | `app/loading.tsx` | RSC (global skeleton) |
| `not-found.tsx` | `app/not-found.tsx` | RSC |
| API (13 routes) | `app/api/**/route.ts` | `configs` (GET/POST/PATCH/DELETE), `health` (GET), `projects` (GET/POST/PATCH/DELETE), `providers` (GET/POST/PATCH/DELETE), `providers/models` (GET/POST), `sessions` (GET/POST), `sessions/[id]` (GET/PATCH/DELETE), `sessions/[id]/attachments` (POST/DELETE), `sessions/[id]/export` (GET), `sessions/[id]/generate` (POST, **NDJSON stream**), `sessions/[id]/qa` (POST, **NDJSON stream**), `skills` (GET/POST/PATCH/DELETE), `state` (GET/PATCH) |

### Component classification

**Atomic primitives (`src/components/ui/`):**

| Component | Notes |
|-----------|-------|
| `Collapsible.tsx` | ARIA disclosure (`aria-expanded`/`aria-controls`, `role="region"` panel) |
| `Icon.tsx` | 22 inline stroke icons, `currentColor`, `aria-hidden` |
| `MotionGate.tsx` | Offscreen-pause gate wrapper |
| `Popover.tsx` | Compound family: Root/Trigger/Content + `usePopover`, `useOutsideClick`, `handleMenuItemKeys`; Escape → focus restore; SSR-safe (unmounted when closed) |
| `ProgressBar.tsx` | `ProgressBar` + `MiniProgressBar`; ratio committed to `--progress` in ref callback (no inline style attr) |

**Domain / feature components:**

| Component | Notes |
|-----------|-------|
| `settings/SettingsApp.tsx` | Tab shell (providers/methodologies/learner/skills/data) + `MethodologyEditor` (step reorder/duplicate) + inline toasts + skeletons |
| `settings/ProviderCard.tsx` | One provider: status, credential form (RHF+Zod: baseUrl commit-on-blur, key save), discover, activate, remove; `DiscoverButton` |
| `studio/StudioApp.tsx` | Studio shell: hydration, session open, SSE run orchestration (rAF-coalesced), toasts, skeleton/error states |
| `studio/Sidebar.tsx` | Collapsible rail ⇄ panel; search, project filter + create/delete, pinned/history lists, session ⋯ menu (pin/rename/move/delete) |
| `studio/TopBar.tsx` | Provider status chip, model picker (listbox popover, roving tabindex), context-level select, clamped-context warning, agent/reasoning toggles, capability chips (+ mobile summary), theme radiogroup |
| `studio/NewSession.tsx` | RHF+Zod form: topic textarea (⌘/Ctrl+Enter), project select, agent toggle, methodology radiogroup (`config-card`), example chips, model-ready warning |
| `studio/StageDeck.tsx` | Orchestrator: `StageToolbar` → stage card (`StageMeta`, body, footer) → reasoning/sources/state collapsibles → Q&A section (`QaThread`, `ComposerForm`, `AttachmentRow`) → `ExportBar` → bottom nav |
| `studio/stage/StageToolbar.tsx` | Header + step-pill rail (roving keyboard, `aria-current="step"`) + progress |
| `studio/stage/StageMeta.tsx` | Stage toolbar + inline prompt editor (remount-keyed draft) |
| `studio/stage/QaThread.tsx` | Thread with ghost exits, copy/regenerate/edit actions, streaming bubble + caret |
| `studio/stage/Composer.tsx` | `ComposerForm` (submit contract) + `Composer` (⌘/Ctrl+Enter) |
| `studio/stage/AttachmentRow.tsx` | Hidden file input, attach button, file chips with remove |
| `studio/stage/ResourceList.tsx` | Source links with mono metadata, `line-clamp-2` snippets |
| `studio/stage/ExportBar.tsx` | 6-format export links (md/zip/docx/pdf/html/txt) |
| `Markdown.tsx` | `memo`-ized `react-markdown` + GFM, `prose-study`/`prose-compact` |

**Layout wrappers:** `app/layout.tsx` (metadata, viewport, theme bootstrap script, skip link), `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`; in-page chrome: `studio-header`/`studio-topbar` (TopBar), `sidebar-rail`/`sidebar-panel` (Sidebar, incl. mobile drawer + backdrop), `nav-bar` (StageDeck bottom nav), `landing-canvas`/`site-nav`/`site-footer` (landing).

## 4. Logic & state freeze matrix

Boundary the redesign must not cross. Every row is a frozen anchor.

| Component | Type | Critical state hooks | Critical handlers / effects | External APIs & actions |
|-----------|------|---------------------|------------------------------|-------------------------|
| `components/studio/StudioApp.tsx` | Client | `useState` ×12 (`state, detail, stageIndex, run, toast, loading, loadError, reloadKey, collapsed, creating, showNew, mobileNavOpen`); `useRef` (`toastTimer`, `pendingUpdates`, `rafHandle`); `useMediaQuery`; `useMemo` (`activeModel`, `activeProvider`); `useEffect` (hydration, theme sync, rAF cleanup) | `notify`, `refreshState`, `openSession`, `scheduleRunUpdate`/`flushRunUpdates` (rAF coalescing), `patchSettings`, `patchSession`, `discover`, `generate` (NDJSON stream consume), `ask`, `editStep`, `upload`, `removeAttachment`, `createSession` (creates → auto-generates stage 0); localStorage: `studio-last-session`, `studio-sidebar-collapsed`, `studio-theme` | `api.state()`, `api.session()`, `api.patchSettings`, `api.patchSession`, `api.discoverModels`, `api.uploadAttachment`, `api.deleteAttachment`, `api.createSession`, `streamRun(/api/sessions/[id]/generate)`, `streamRun(/api/sessions/[id]/qa)` |
| `components/studio/Sidebar.tsx` | Client | `useState` (`query`, `projectFilter`, `creatingProject`, `projectName`); `useRef` (`panelRef`); `useMediaQuery`; `useEffect` (Escape / focus into drawer) | `act()` (guard + refresh + toast), `handleSelect` (closes mobile drawer), `handleNew`, project create form submit, session pin/rename/move/delete (uses `window.prompt` / `window.confirm`) | `api.createProject`, `api.deleteProject`, `api.patchSession` (pinned/title/projectId), `api.deleteSession` |
| `components/studio/TopBar.tsx` | Client | `useState` (`query`, `freeOnly`, `discovering`, `cursorFocusSignal`); `useMemo` (model filter slice 300) | `selectModel` (patches settings), `refreshProvider`, ArrowDown/Up open+focus signal; `ModelList` roving-tabindex listbox (`activeIndex`, `optionRefs`, focus on `focusCursorSignal`) | `onPatchSettings({activeProviderId, activeModelId, contextLevel, theme, reasoningEnabled, dynamicAgent})`, `onPatchSession({dynamicAgent})`, `onDiscover` |
| `components/studio/NewSession.tsx` | Client | `useForm` (zod: `topic`, `configId`, `projectId`, `dynamicAgent`; `mode: "onTouched"`); `useWatch` | `handleSubmit(onSubmit)` → `onCreate`; ⌘/Ctrl+Enter submit; example chip `setValue(..., {shouldValidate})`; submit disabled on `!isValid \|\| !topic.trim() \|\| busy` | `onCreate` → `api.createSession` (+ auto `generate(0)` in parent) |
| `components/studio/StageDeck.tsx` | Client | `useState` (`question`); `useRef` (`bodyRef`); `useMemo` (`stageMessages`); `useEffect` (scroll-to-top on stage change) | `copy()` (clipboard + toast), nav-bar next button (`onStageIndex` + auto `onGenerate(next, "none")`), stage footer generate/regenerate/longer/shorter/deeper, `qaStreamingActive` | `onGenerate`, `onAsk`, `onEditStep`, `onUpload`, `onDeleteAttachment`, `navigator.clipboard.writeText` |
| `components/studio/stage/StageToolbar.tsx` | Client | — (pure) | `handleRailKeys` (←/→/Home/End roving focus), pill `onClick` → `onStageIndex` | — (props only) |
| `components/studio/stage/StageMeta.tsx` | Client | `useState` (`editing`, `draftTitle`, `draftInstructions` — remount-keyed by parent `promptKey`) | Save & Regenerate → `onEditStep` **then** `onGenerate`; Save only → `onEditStep`; Cancel | `onEditStep`, `onGenerate` |
| `components/studio/stage/QaThread.tsx` | Client | `useGhostExits(stageMessages)` (`live` + `ghosts`) | `onCopy`, `onAsk` (regenerate reuses last user content), `onEditQuestion` (prefill composer) | — (props only) |
| `components/studio/stage/Composer.tsx` | Client | controlled `value` (parent-owned) | form `onSubmit` (trim, clear, `onSubmit`); ⌘/Ctrl+Enter in textarea | — (props only) |
| `components/studio/stage/AttachmentRow.tsx` | Client | `useRef` (`fileRef`) | file input `onChange` (resets `value=""` then `onUpload`), chip remove | `onUpload`, `onDeleteAttachment` |
| `components/studio/stage/ExportBar.tsx` | Client | — | direct `<a href="/api/sessions/[id]/export?format=…">` (pdf in `_blank`) | export GET routes |
| `components/settings/SettingsApp.tsx` | Client | `useState` ×9 (`state, loadError, reloadKey, tab` (hash-init `#methodologies`), `toast, editorId, draft, skillUrl, skillPreview, customProvider`); `useRef` (`tabRefs`, `toastTimer`); `useEffect` (hydration) | `guard()` (action → refresh → toast), `handleTabKeys` (roving tabs), learner textareas commit **onBlur**, temperature commits on **mouseUp/touchEnd**, methodology step add/move/remove, skill preview/import, custom-provider form | `api.state`, `api.patchSettings`, `api.createProvider/patchProvider/deleteProvider`, `api.discoverModels`, `api.createConfig/patchConfig/deleteConfig`, `api.patchSkill/deleteSkill`, `api.previewSkill/importSkill`, `applyTheme` |
| `components/settings/ProviderCard.tsx` | Client | `useForm` (zod: `baseUrl` URL-refine, `apiKey`); `useWatch`; `DiscoverButton` local `busy` | `commitBaseUrl()` on **blur** (parse → patch), `saveKey()` (patch then clear field), remove with `window.confirm`, "Use this provider" activates first cached model | `api.patchProvider`, `api.deleteProvider`, `api.discoverModels`, `api.patchSettings` |
| `components/ui/Popover.tsx` | Client | `useState` (`open`); `useRef` (trigger/content); `useId` | toggle/dismiss (focus restore), global Escape capture, `useOutsideClick` (pointerdown, capture), menu autofocus first item, `handleMenuItemKeys` | — |
| `components/ui/Collapsible.tsx` | Client | `useState` (`open`); `useId` | toggle, `aria-controls` | — |
| `components/ui/ProgressBar.tsx` | Client | — | ref callback writes `--progress` | — |
| `components/ui/MotionGate.tsx` | Client | `useOffscreenPause` ref | IntersectionObserver → `data-offscreen` | — |
| `components/Markdown.tsx` | Client | `memo` | — (renders `prose-study`) | — |
| `app/layout.tsx` | RSC | — | inline theme bootstrap script (pre-paint `data-theme`, reveal arming), skip link | `localStorage["studio-theme"]` |
| `lib/theme.ts` | Client | module `fadeTimer` | `applyTheme(theme, {crossfade})` (220ms `.theme-fade` class) | — |
| `lib/motion.ts` | Client | `useGhostExits` (`ghosts`, `previous`, `timer`) | `RevealController` (IntersectionObserver reveals), `useOffscreenPause` | — |
| `lib/client/api.ts` | Client | — | `request()` (JSON, no-store), `streamRun()` (NDJSON reader loop) | **all** 13 API routes |
| `app/api/**/route.ts` | RSC (server) | — | `ensureBootstrap`, drizzle queries, `sanitizeProvider`, NDJSON run streaming (`lib/engine/*`) | SQLite `.data/studio.db`; provider HTTP calls |

## 5. Visual debt & inconsistency inventory

> Overall: **low debt.** This codebase already carries a disciplined token system, WCAG 2.2 AA target sizes, forced-colors/reduced-motion handling, and tokenized elevation. The list below is what genuinely remains.

### 5.1 Typography debt

- **Dual type vocabularies in JSX.** Semantic token utilities (`text-small`, `text-micro`, `text-body`) coexist with raw Tailwind scale classes on headings: `text-2xl font-semibold tracking-tight` (`StageToolbar.tsx:87`, `SettingsApp.tsx:291`), `font-serif text-3xl leading-tight` (`NewSession.tsx:75`), `text-lg font-medium tracking-tight` (`StageMeta.tsx:44`, `QaThread` headings, `ExportBar.tsx:18`), `text-2xl font-semibold` (SettingsApp data tab `dd`). Result: consistent output today, but no single enforced heading scale for the next iteration. *(low)*
- Body micro-copy uses `text-xs`/`text-micro` interchangeably for similar roles (sidebar meta, topbar chips, composer hint). *(low)*

### 5.2 Spatial & layout debt

- **Single arbitrary value in JSX:** `min-h-[5.5rem]` — `NewSession.tsx:90` (topic textarea). Off the 8pt token scale; should be a token or `min-h-20` (5rem) / `min-h-[88px]`. *(low)*
- Half-step spacing (`mt-0.5`, `gap-1.5`, `py-3.5`, `space-y-0.5`) is used liberally in dense chrome (TopBar, stage toolbar, sidebar) — intentional optical control per the CSS header comment, but worth consolidating to the declared 4px half-step token if a global audit is wanted. *(low)*
- No hardcoded widths (`w-[342px]`-class) and no inline `style=` attributes in JSX (grep: zero hits) — the `--progress` ref-callback pattern keeps CSS in charge. *(none found)*

### 5.3 Depth & elevation flaws

- Tokenized 3-level shadow system with inked (non-black) dark-mode shadows; cards/borders use layered semi-transparent lines. *(none found — system is clean)*
- One nuance: `.card-elevated` adds `backdrop-filter: blur(14px)` but is used over opaque backgrounds on the landing (showcase) — the glass reads as a flat surface there; either lean into translucency (place over the ambient canvas) or drop the filter. *(low, cosmetic)*

### 5.4 Interactive & accessibility gaps

- **Native dialogs break the visual language:** `window.prompt` (session rename — `Sidebar.tsx:74`) and `window.confirm` ×4 (session delete `Sidebar.tsx:100`, project delete `Sidebar.tsx:309`, methodology delete `SettingsApp.tsx:129`, provider remove `ProviderCard.tsx:236`). Browser chrome, un-themeable, no focus management beyond OS default. *(high — most visible design break in the app)*
- **Toasts: single-instance, non-stacking, duplicated implementation** (`StudioApp.tsx:470` and `SettingsApp.tsx:801` each render their own toast layer with a `setTimeout` lifetime). No stacking, no pause-on-hover, no per-tone iconography beyond warn/check. *(medium)*
- **Icon set:** 22 hand-drawn stroke glyphs (`Icon.tsx`) — stroke widths and corner radii are hand-tuned per glyph; at 16px some glyphs (settings, paperclip, study) read heavier than others. No optical sizing, no brand-consistent set. *(medium)*
- No `cn()`-style class merge helper; composition is template literals (`btn btn-xs ${agentOn ? "btn-primary" : ""}` — `TopBar.tsx:318,333`; `chip ${supported ? "chip-on" : "chip-off"}` — `TopBar.tsx:45`; `` `msg … ${…} msg-exit` `` — `QaThread.tsx:99`; `prose-study ${className}` — `Markdown.tsx:9`). No collision today, but it is the one spot where a presentation refactor could silently break class ordering (Tailwind v4 specificity). *(medium — structural)*
- State coverage: `hover:`/`active:`/`focus-visible:`/`disabled:` exist for **every** control class (34 hover/active rules, 15 `focus-visible` rules in `globals.css`); skeletons exist (global `loading.tsx`, `StudioSkeleton`, `SettingsSkeleton`, streaming `skeleton` blocks, shimmer). Aria: icon-only buttons carry `aria-label`s; menus/listbox/tabs/radiogroups are fully wired; `aria-busy` used on pending buttons. *(no gaps found beyond the dialog/toast items above)*
- Responsive: mobile drawer + 44px coarse-pointer targets + safe-area insets handled in `globals.css` §9; no breakpoint failures found. Landing showcase collapses to single column `<1024px`. *(none found)*

## 6. Priority refactor candidates

| # | Component | File | Severity | Transformation goals |
|---|-----------|------|----------|----------------------|
| 1 | Native dialogs → design-consistent overlays | `src/components/studio/Sidebar.tsx`, `src/components/settings/SettingsApp.tsx`, `src/components/settings/ProviderCard.tsx` | **high** | Replace `window.prompt`/`window.confirm` (5 call sites) with the existing `Popover`/`card` language: a rename input popover and a confirm sheet (mobile: bottom sheet pattern per TRANSFORM recipes). Handlers keep identical signatures; only the prompt surface changes. |
| 2 | Toast system | `src/components/studio/StudioApp.tsx`, `src/components/settings/SettingsApp.tsx` | **medium** | One shared toast stack (Sonner-style: stacked, spring entrance, swipe/auto-dismiss, per-tone borders already tokenized via `.toast[data-tone]`). Same `notify(kind, message)` contract; drop the two duplicated layers. |
| 3 | Icon set | `src/components/ui/Icon.tsx` | **medium** | Swap the 22 hand-drawn glyphs for a consistent 16px stroke set (same names, same `currentColor` API, same `aria-hidden`), or optically rebalance the current set. Presentation-only: no call-site prop changes. |
| 4 | `cn()` class merge | `TopBar.tsx`, `NewSession.tsx`, `QaThread.tsx`, `Markdown.tsx`, `SettingsApp.tsx` (chip `data-active` ternaries) | **medium** | Introduce `cn()` (clsx + tailwind-merge) and route every concatenated/prop-passed class string through it (logic-freeze instruction #5). Zero visual change; collision-safe composition. |
| 5 | Data-tab stat row | `src/components/settings/SettingsApp.tsx` (data tab `dl`, ~line 780) | **low** | Promote the 4 raw stat blocks to KPI-style bento cards (mono tabular numerals already used; add label/delta treatment, `rounded-2xl`, ring borders). Pure markup/Token change. |
| 6 | Heading scale unification | `StageToolbar.tsx`, `StageMeta.tsx`, `SettingsApp.tsx`, `NewSession.tsx`, `ExportBar.tsx`, `QaThread.tsx` | **low** | Fold the raw `text-2xl/text-3xl/text-lg … tracking-tight` heading utilities into the existing semantic scale (`--type-h1…h3` / `.header-title`-style classes) so one token owns the type system. |
| 7 | Landing showcase glass | `src/app/page.tsx` (showcase card), `globals.css` (`.card-elevated`) | **low** | Either move the showcase over the ambient glow (true translucency payoff) or drop `backdrop-filter` on opaque contexts; remove the single `min-h-[5.5rem]` arbitrary value in favor of a token (`NewSession.tsx:90`). |

**Not candidates (intentional, keep as-is):** CSS-only motion system (no motion library needed), `data-theme` palette switching (not Tailwind `dark:`), hand-rolled `Popover`/`Collapsible` (fully ARIA-compliant; replacing with Radix would be churn without benefit), `rAF`-coalesced run updates, `content-visibility` thread optimization, export format links.

---

## 7. Machine-readable dossier (JSON)

```json
{
  "project_metadata": {
    "next_version": "16.2.6",
    "router_type": "app",
    "react_version": "19.2.6",
    "tailwind_version": "4.1.17",
    "installed_ui_libraries": [],
    "installed_icon_libraries": [],
    "installed_motion_libraries": [],
    "utility_helpers": [],
    "forms_stack": ["react-hook-form@7.88.0", "@hookform/resolvers@5.9.1", "zod@4.6.2"],
    "data_layer": ["drizzle-orm@0.45.2", "drizzle-kit@0.31.10", "sqlite (.data/studio.db)"],
    "export_stack": ["marked", "mammoth", "docx", "jszip", "unpdf"],
    "qa_stack": ["playwright", "@axe-core/playwright", "stylelint", "eslint-config-next"]
  },
  "design_system_status": {
    "custom_tokens_defined": true,
    "color_palette_type": "custom-css-variables",
    "typography_found": ["system-ui", "Iowan Old Style", "Palatino", "ui-monospace", "token-scale (clamp fluid)"],
    "dark_mode_supported": true,
    "themes": ["light", "dark", "editorial (default)"],
    "theme_mechanism": "data-theme on <html>, pre-paint bootstrap script, localStorage persistence, 220ms cross-fade",
    "global_css_overrides": [
      ".card / .card-elevated / .lift",
      ".btn / .btn-primary / .btn-ghost / .btn-xs",
      ".input / .select / .textarea / .field-error",
      ".chip / .chip-on / .chip-off / .chip-warn",
      ".sidebar-item / .icon-btn / .theme-switch / .settings-tab",
      ".step-pill / .step-dot / .progress-track / .progress-ratio",
      ".msg / .msg-user / .msg-assistant / .composer / .attach-chip",
      ".skeleton / .dot-pulse / .caret / .status-dot / .status-led",
      ".fold / .menu-surface / .popover-surface / .toast",
      ".prose-study / .prose-compact",
      "landing: .hero-title / .section-title / .display-title / .panel / .showcase / .rail",
      "mobile §9 drawer, print §10, reduced-motion §8, forced-colors + prefers-contrast §2"
    ]
  },
  "logic_freeze_matrix": [
    {
      "component_path": "src/components/studio/StudioApp.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState x12 (state, detail, stageIndex, run, toast, loading, loadError, reloadKey, collapsed, creating, showNew, mobileNavOpen)", "useRef (toastTimer, pendingUpdates, rafHandle)", "useMediaQuery", "useMemo (activeModel, activeProvider)", "useEffect (hydration, theme sync, rAF cleanup)"],
      "critical_handlers": ["notify", "refreshState", "openSession", "scheduleRunUpdate/flushRunUpdates (rAF)", "patchSettings", "patchSession", "discover", "generate", "ask", "editStep", "upload", "removeAttachment", "createSession (auto-generates stage 0)"],
      "external_apis_or_actions": ["api.state()", "api.session()", "api.patchSettings", "api.patchSession", "api.discoverModels", "api.uploadAttachment", "api.deleteAttachment", "api.createSession", "streamRun(/api/sessions/[id]/generate)", "streamRun(/api/sessions/[id]/qa)", "localStorage: studio-last-session / studio-sidebar-collapsed / studio-theme"]
    },
    {
      "component_path": "src/components/studio/Sidebar.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState (query, projectFilter, creatingProject, projectName)", "useRef (panelRef)", "useMediaQuery", "useEffect (Escape + drawer focus)"],
      "critical_handlers": ["act() guard+refresh+toast", "handleSelect (closes mobile drawer)", "handleNew", "project create submit", "session pin/rename/move/delete (window.prompt/confirm)"],
      "external_apis_or_actions": ["api.createProject", "api.deleteProject", "api.patchSession (pinned/title/projectId)", "api.deleteSession"]
    },
    {
      "component_path": "src/components/studio/TopBar.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState (query, freeOnly, discovering, cursorFocusSignal)", "useMemo (model filter, slice 300)", "ModelList: useState (activeIndex), useRef (optionRefs)"],
      "critical_handlers": ["selectModel", "refreshProvider", "ArrowDown/Up open+focus signal", "context-level select onChange", "agent/reasoning toggle", "theme radiogroup"],
      "external_apis_or_actions": ["onPatchSettings (activeProviderId/activeModelId/contextLevel/theme/reasoningEnabled/dynamicAgent)", "onPatchSession (dynamicAgent)", "onDiscover"]
    },
    {
      "component_path": "src/components/studio/NewSession.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useForm (zod: topic, configId, projectId, dynamicAgent; mode onTouched)", "useWatch"],
      "critical_handlers": ["handleSubmit(onSubmit) -> onCreate", "Cmd/Ctrl+Enter submit", "example chip setValue(shouldValidate)", "submit disabled on !isValid || !topic.trim() || busy"],
      "external_apis_or_actions": ["onCreate -> api.createSession (+ parent auto generate(0))"]
    },
    {
      "component_path": "src/components/studio/StageDeck.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState (question)", "useRef (bodyRef)", "useMemo (stageMessages)", "useEffect (scroll-to-top on stageIndex)"],
      "critical_handlers": ["copy() (clipboard + toast)", "nav next (onStageIndex + auto onGenerate(next,'none'))", "stage footer generate/regenerate/longer/shorter/deeper"],
      "external_apis_or_actions": ["onGenerate", "onAsk", "onEditStep", "onUpload", "onDeleteAttachment", "navigator.clipboard.writeText"]
    },
    {
      "component_path": "src/components/studio/stage/StageToolbar.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": [],
      "critical_handlers": ["handleRailKeys (Arrow/Home/End roving focus)", "pill onClick -> onStageIndex"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/studio/stage/StageMeta.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState (editing, draftTitle, draftInstructions) — parent remount-keyed via promptKey"],
      "critical_handlers": ["Save&Regenerate: onEditStep THEN onGenerate", "Save only: onEditStep", "Cancel"],
      "external_apis_or_actions": ["onEditStep", "onGenerate"]
    },
    {
      "component_path": "src/components/studio/stage/QaThread.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useGhostExits(stageMessages) -> live + ghosts"],
      "critical_handlers": ["onCopy", "onAsk (regenerate reuses last user content)", "onEditQuestion (composer prefill)"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/studio/stage/Composer.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["controlled value (parent-owned)"],
      "critical_handlers": ["form onSubmit (trim, clear, onSubmit)", "Cmd/Ctrl+Enter in textarea"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/studio/stage/AttachmentRow.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useRef (fileRef)"],
      "critical_handlers": ["file input onChange (resets value='', then onUpload)", "chip remove -> onDeleteAttachment"],
      "external_apis_or_actions": ["onUpload", "onDeleteAttachment"]
    },
    {
      "component_path": "src/components/studio/stage/ExportBar.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": [],
      "critical_handlers": ["<a href=/api/sessions/[id]/export?format=...> (pdf in new tab)"],
      "external_apis_or_actions": ["export GET route (md/zip/docx/pdf/html/txt)"]
    },
    {
      "component_path": "src/components/settings/SettingsApp.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState x10 (state, loadError, reloadKey, tab (hash-init), toast, editorId, draft, skillUrl, skillPreview, customProvider)", "useRef (tabRefs, toastTimer)", "useEffect (hydration)"],
      "critical_handlers": ["guard()", "handleTabKeys (roving tabs)", "learner textareas commit onBlur", "temperature commit on mouseUp/touchEnd", "methodology step add/move/remove/duplicate", "skill preview/import", "custom provider form submit"],
      "external_apis_or_actions": ["api.state", "api.patchSettings", "api.createProvider/patchProvider/deleteProvider", "api.discoverModels", "api.createConfig/patchConfig/deleteConfig", "api.patchSkill/deleteSkill", "api.previewSkill/importSkill", "applyTheme"]
    },
    {
      "component_path": "src/components/settings/ProviderCard.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useForm (zod: baseUrl URL-refine, apiKey)", "useWatch", "DiscoverButton useState (busy)"],
      "critical_handlers": ["commitBaseUrl() on blur (parse then patch)", "saveKey() (patch then clear field)", "remove (window.confirm)", "activate provider (first cached model)"],
      "external_apis_or_actions": ["api.patchProvider", "api.deleteProvider", "api.discoverModels", "api.patchSettings"]
    },
    {
      "component_path": "src/components/ui/Popover.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState (open)", "useRef (trigger, content)", "useId"],
      "critical_handlers": ["toggle/dismiss (focus restore)", "global Escape capture", "useOutsideClick (pointerdown capture)", "menu autofocus first item", "handleMenuItemKeys"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/ui/Collapsible.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useState (open)", "useId"],
      "critical_handlers": ["toggle (aria-expanded/aria-controls)"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/ui/ProgressBar.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": [],
      "critical_handlers": ["ref callback writes --progress (no inline style attr)"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/ui/MotionGate.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["useOffscreenPause ref"],
      "critical_handlers": ["IntersectionObserver -> data-offscreen"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/components/Markdown.tsx",
      "component_type": "Client Component",
      "critical_state_hooks": ["memo"],
      "critical_handlers": ["react-markdown + remark-gfm render (prose-study)"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/app/layout.tsx",
      "component_type": "RSC",
      "critical_state_hooks": [],
      "critical_handlers": ["pre-paint theme bootstrap script (data-theme + data-reveal-ready)", "skip link"],
      "external_apis_or_actions": ["localStorage['studio-theme']"]
    },
    {
      "component_path": "src/lib/theme.ts",
      "component_type": "Client Module",
      "critical_state_hooks": ["module-level fadeTimer"],
      "critical_handlers": ["applyTheme(theme, {crossfade}) (220ms .theme-fade)"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/lib/motion.ts",
      "component_type": "Client Module",
      "critical_state_hooks": ["useGhostExits (ghosts, previous map, timer)"],
      "critical_handlers": ["RevealController (IntersectionObserver reveals)", "useOffscreenPause", "prefersReducedMotion"],
      "external_apis_or_actions": []
    },
    {
      "component_path": "src/lib/client/api.ts",
      "component_type": "Client Module",
      "critical_state_hooks": [],
      "critical_handlers": ["request() (JSON, cache no-store)", "streamRun() (NDJSON reader loop)"],
      "external_apis_or_actions": ["all 13 API routes"]
    },
    {
      "component_path": "src/app/api/**/route.ts",
      "component_type": "RSC (server, runtime nodejs)",
      "critical_state_hooks": [],
      "critical_handlers": ["ensureBootstrap", "drizzle queries", "sanitizeProvider", "NDJSON run streaming (lib/engine)"],
      "external_apis_or_actions": ["SQLite .data/studio.db", "provider HTTP endpoints"]
    }
  ],
  "visual_debt_audit": {
    "typography_inconsistencies": [
      "Dual type vocabularies: semantic token utilities (text-small/text-micro) coexist with raw Tailwind heading classes — text-2xl sm:text-3xl font-semibold tracking-tight (StageToolbar.tsx:87, SettingsApp.tsx:291), font-serif text-3xl (NewSession.tsx:75), text-lg font-medium (StageMeta.tsx:44, ExportBar.tsx:18, QaThread heading)",
      "text-xs vs text-micro used interchangeably for micro metadata (sidebar meta, topbar chips, composer hint)"
    ],
    "spatial_bottlenecks": [
      "Only one arbitrary value in JSX: min-h-[5.5rem] (NewSession.tsx:90) — off the 8pt token scale",
      "Dense chrome relies on half-step utilities (mt-0.5, gap-1.5, py-3.5, space-y-0.5) — intentional optical control, not consolidated into the 4px half-step token"
    ],
    "arbitrary_values_detected": [
      "min-h-[5.5rem] — NewSession.tsx:90 (only hit; grep for [px]/[rem]/[hex] in className across src returned no others)",
      "No inline style= attributes in JSX (ProgressBar uses --progress custom property via ref)"
    ],
    "elevation_and_depth_flaws": [
      "None systemic: 3-level tokenized shadows, inked dark-mode shadows, layered semi-transparent borders",
      ".card-elevated backdrop-filter reads flat over opaque landing background (showcase) — cosmetic"
    ],
    "accessibility_and_contrast_gaps": [
      "window.prompt (Sidebar.tsx:74) + window.confirm x4 (Sidebar.tsx:100, Sidebar.tsx:309, SettingsApp.tsx:129, ProviderCard.tsx:236) — native dialogs un-themeable, outside the design language",
      "Toasts: single-instance, non-stacking, duplicated implementation in StudioApp.tsx and SettingsApp.tsx (setTimeout lifetime, no stacking/pause-on-hover)",
      "Icon set: 22 hand-drawn glyphs with per-glyph stroke-weight drift at 16px (Icon.tsx)",
      "No cn() merge helper — template-literal class composition (TopBar.tsx:318/333, TopBar.tsx:45, QaThread.tsx:99, Markdown.tsx:9) — collision risk under future refactors"
    ],
    "responsive_breakpoint_failures": []
  },
  "priority_refactor_candidates": [
    {
      "component_name": "Native dialogs (rename/confirm)",
      "file_path": "src/components/studio/Sidebar.tsx; src/components/settings/SettingsApp.tsx; src/components/settings/ProviderCard.tsx",
      "severity": "high",
      "transformation_goals": "Replace 5 window.prompt/confirm call sites with Popover/card-language rename popover + confirm sheet (mobile bottom-sheet pattern); handler signatures unchanged"
    },
    {
      "component_name": "Toast system",
      "file_path": "src/components/studio/StudioApp.tsx; src/components/settings/SettingsApp.tsx",
      "severity": "medium",
      "transformation_goals": "One shared stacked toast (spring entrance, auto-dismiss, per-tone .toast[data-tone] already tokenized); keep notify(kind, message) contract; remove the two duplicated layers"
    },
    {
      "component_name": "Icon set",
      "file_path": "src/components/ui/Icon.tsx",
      "severity": "medium",
      "transformation_goals": "Consistent 16px stroke icon set under the same name/API/aria-hidden contract (or optical rebalance of current 22 glyphs); zero call-site prop changes"
    },
    {
      "component_name": "cn() class merge",
      "file_path": "src/components/studio/TopBar.tsx; src/components/studio/NewSession.tsx; src/components/studio/stage/QaThread.tsx; src/components/Markdown.tsx; src/components/settings/SettingsApp.tsx",
      "severity": "medium",
      "transformation_goals": "Introduce cn() (clsx + tailwind-merge); route every concatenated/prop-passed class string through it (logic-freeze instruction #5); zero visual delta"
    },
    {
      "component_name": "Data-tab stat row",
      "file_path": "src/components/settings/SettingsApp.tsx",
      "severity": "low",
      "transformation_goals": "Promote 4 raw stat blocks to KPI bento cards (tabular-nums already in use; ring borders, rounded-2xl, label/delta treatment)"
    },
    {
      "component_name": "Heading scale unification",
      "file_path": "src/components/studio/stage/StageToolbar.tsx; src/components/studio/stage/StageMeta.tsx; src/components/settings/SettingsApp.tsx; src/components/studio/NewSession.tsx; src/components/studio/stage/ExportBar.tsx; src/components/studio/stage/QaThread.tsx",
      "severity": "low",
      "transformation_goals": "Fold raw text-2xl/text-3xl/text-lg heading utilities into the existing semantic scale (--type-h1..h3 / .header-title-class family) so one token owns the type system"
    },
    {
      "component_name": "Landing showcase glass + token cleanup",
      "file_path": "src/app/page.tsx; src/app/globals.css; src/components/studio/NewSession.tsx",
      "severity": "low",
      "transformation_goals": "Either place showcase over the ambient glow for true translucency or drop backdrop-filter on opaque contexts; replace min-h-[5.5rem] with a token"
    }
  ]
}
```

---

*Audit complete. Next step per the pipeline: `/qna-plan` (optional design-intent Q&A) → `/plan-redesign` (writes `plan.md`, strictly from the 27 curated sources).*
