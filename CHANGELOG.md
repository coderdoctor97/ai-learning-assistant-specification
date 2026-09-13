# Changelog

All notable changes to **Learning Studio** are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-09-12

**Release type:** MINOR — backward-compatible visual capability. New design-token layer, motion system,
landing-page structure and chat-interface styling. No public API, prop contract, state hook, handler
signature, runtime behaviour, module import or dependency changed.

**Scope:** `src/app/page.tsx`, `src/app/globals.css`, `src/components/studio/StageDeck.tsx`,
`src/components/studio/StudioApp.tsx`, `src/components/studio/Sidebar.tsx` (one presentational conversion).
Plan and invariant audit: [`docs/VISUAL-POLISH-PLAN.md`](docs/VISUAL-POLISH-PLAN.md).
No git tag is created for this entry — tagging is reserved for the release cut on `main`
(one annotated tag per release, never moved).

### Added

**Design token layer** (`src/app/globals.css`)
- Typography tokens: refined sans/serif stacks plus a new `--font-mono`, a fluid type scale
  (`--type-display`, `--type-h1…--type-micro`), leading and tracking tokens, and a `font-mono` utility mapping.
- An 8pt rhythm scale (`--space-1` → `--space-12`, with a 4px half-step reserved for optical control),
  a radii scale (`--radius-xs` → `--radius-pill`) and three elevation tiers (`--shadow-1/2/3`).
- A motion vocabulary: `--dur-instant/quick/base/slow/reveal`, `--ease-out`, `--ease-out-soft`,
  `--ease-in-out` and a `--stagger` step, so no component hardcodes a duration or curve.
- Per-theme `--glow`, `--accent-bright` and `--on-accent` tokens, plus translucent `--border`
  and `--border-soft` hairlines and a `--bg-deep` ambient shade.
- Grounded composer (`.composer`, `.composer-input`, `.composer-actions`, `.composer-hint`) with a
  `:focus-within` ring, a `⌘ ↵ / Ctrl ↵ to send` affordance that documents the existing submit shortcut,
  and an `.attach-row` strip.
- Message-stream anatomy: `.thread`, `.msg`, `.msg-user`, `.msg-assistant`, `.msg-head` (role label with an
  accent marker), `.msg-thinking` (typing indicator) and `.msg-actions` (divider-separated action row).
- Chat-container anatomy: `.studio-shell`, `.studio-header`, `.header-meta`, `.header-title`,
  `.step-pill`/`.step-dot`, `.progress-track`/`.progress-bar`, `.stage-toolbar`, `.stage-body`,
  `.stage-footer`, `.nav-bar` and `.fold`/`.fold-head`/`.fold-body` disclosure surfaces.
- Landing-page composition: `.landing-canvas` (warm bloom over a masked 72px engineering grid),
  sticky `.site-nav` with backdrop blur, `.brand`, `.nav-link`, `.hero-title`/`.display-title`/`.section-title`,
  `.text-gradient`, `.section-rule`, `.showcase` with a 6-node `.rail` + `.progress-fill` + `.mock-bubble`
  product preview, `.panel`/`.panel-title`/`.panel-body`, `.cta-band` and `.site-footer`.

**Motion system** — all keyframes animate `opacity`/`transform` only
- `heroRise` (16px → 0 with fade) driven by the `.reveal` / `.reveal-quick` stagger utilities.
- `messageIn` for newly mounted chat bubbles, `riseIn` for panel entrances, `pulseDot` for typing dots,
  `pulseSoft` for the streaming status dot, `caretBlink` for the streaming caret, `shimmerSweep` for a
  clipped skeleton sweep, and `growX` for the showcase progress fill.
- `.lift` / `.lift-strong` hover elevation bounded to a 1.02 scale at ~200ms ease-out, applied to
  interactive cards and buttons.

**Documentation**
- `docs/VISUAL-POLISH-PLAN.md` — component map, presentational/functional boundary, frozen invariants,
  work breakdown (WP-0…WP-6), checkpoints (CP-1…CP-6), Definition of Done and risk register, recorded
  before any style edit.
- This changelog.

**Accessibility**
- Visible `:focus-visible` outlines for every interactive element (links, buttons, inputs, selects,
  textareas, tabbable rows), with form controls keeping their dedicated ring instead of a double outline.
- The per-message `✎ Edit` action, previously revealed on hover only, is now also revealed on keyboard focus.

### Changed

**Typography & hierarchy**
- Display typography is now fluid and balanced: `text-wrap: balance` on headings, `text-wrap: pretty` on
  prose, tightened tracking on display sizes and a 1.6 body line-height; `.prose-study` body copy moved to
  a 1.72 line-height with tighter heading rhythm and monospace code.
- Meta text (rail counters, labels, composer hint, footer status) uses the monospace stack to separate
  machine facts from prose.

**Colour & contrast** (see *Fixed* for measured failures)
- Every palette value in all three themes was re-derived against the new surfaces: translucent borders
  instead of solid rules, slightly deeper text/muted values, and accent scales that hold up on every surface
  (`--accent` is now a contrast-safe ink colour, `--accent-bright` is reserved for decorative gradients).
- Button labels use an explicit `--on-accent` token per theme instead of a theme-specific override.

**Components**
- Buttons: `12px` radius, 8pt padding rhythm, 200ms ease-out transitions, hover lift of
  `translateY(-1px) scale(1.02)`, a pressed state, and elevation on `.btn-primary` hover. Full-width
  buttons deliberately opt out of the scale transform so no container can overflow horizontally.
- Inputs/selects/textareas: hover border reinforcement, accent focus border with a 3px ring, softened
  placeholders.
- Chips, labels and sidebar rows are token-driven with transitions; the active row gains an inset ring.
- Cards use a two-tier radius/shadow system; the landing showcase and closing band use
  `.card-elevated` with `backdrop-filter` for depth.
- Study export panel, stage empty state and section spacing follow the 8pt rhythm.

**Chat interface structure**
- The landing page is reorganised into seven sections (sticky nav, hero + product showcase, pillars,
  facts, closing CTA, footer) with staggered reveals; the "Enter the Studio →" and "Configure providers"
  call-to-actions and their `/studio` and `/settings` targets are unchanged.
- The studio gains an ambient shell, a glass session header with a dedicated metadata band, a redesigned
  stage rail, and a grounded composer; the message stream differentiates roles through fill, corner radii
  (user: `rounded-br-xs`, assistant: `rounded-bl-xs`) and a role label rather than colour alone.

**Presentational-only refactors** (recorded in the plan as C1–C4; computed values unchanged)
- Step pills and their index dots moved from inline `style` objects to `data-active` / `data-generated`
  attributes with CSS rules carrying the identical token values, which restores hover/focus cascade control.
- The disclosure (`Collapsible`) header moved its inline `color` style to a `data-tone` attribute.
- Sidebar session rows and the stage rail express progress through `transform: scaleX(ratio)` instead of an
  animated `width`, using the same computed ratio.
- The toast's centring and its entrance animation now live on separate elements (centring on an outer
  wrapper, animation on the card) so the two compose predictably, and the wrapper adds safe padding.
- Pillar cards moved from `<h2>` to `<h3>` beneath the new section `<h2>`; every card's copy is unchanged.

### Fixed

- **WCAG 2.2 AA contrast.** Measured against the previous tokens, 11 of 45 text/background pairs fell below
  4.5:1 — worst in the default *editorial* theme (accent on `surface2` 3.62:1, muted on bg 4.18:1,
  good on bg 4.02:1, warn on bg 4.04:1) and in *light* (accent on bg 4.41:1, accent on accent-soft 4.23:1).
  All 48 audited pairs in the new palette now pass at ≥ 4.5:1, verified by script
  (`docs/VISUAL-POLISH-PLAN.md` §6).
- **Layout-animating transitions removed.** Both progress indicators previously transitioned `width`;
  the skeleton placeholder animated `background-position`. They now animate `transform` (`scaleX`,
  `translateX`) only, and the compiled stylesheet was audited to confirm every keyframe and every
  `transition` declaration targets `opacity`/`transform`.
- **Reduced-motion policy strengthened.** The previous `prefers-reduced-motion` block only clamped
  animation/transition durations; it now disables animation outright and restores the settled state for
  every element that animates in from a hidden state, while deliberately preserving transforms that
  encode state (progress-bar ratios) so they do not snap to full.
- **Keyboard-reachable message actions.** The `✎ Edit` control on user messages was invisible to keyboard
  users (`opacity-0`, hover-only reveal); it now appears on focus as well.

### Notes on this release

- No dependency, `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, or lockfile change.
- `src/lib/**`, `src/db/**`, `src/app/api/**`, `src/components/settings/**`, `Markdown.tsx`, `TopBar.tsx`,
  `NewSession.tsx` and `src/app/layout.tsx` are byte-identical to `0.1.0` (38 files verified by hash).
- `npm run typecheck`, `npm run build` and the end-to-end API flow (create session → generate all six
  stages → per-stage Q&A → export) pass; `npm run lint` reports the same four pre-existing findings as
  the baseline and nothing new.
- Verification is structural and script-based (contrast, keyframe property, transition property,
  hook/handler/prop-signature and file-hash diffs) because the build environment has no browser runtime
  available for screenshot comparison.

---

## [0.1.0] — 2026-09-13 *(retroactive baseline)*

The initial Learning Studio release (`fd863fd`), documented retroactively for continuity: the local-first
learning engine with its sequential stage workflow, per-stage Q&A, dynamic agent mode, retrieval,
provider catalog, capability-aware controls, file attachments, GitHub skill import, study-document export
and local SQLite persistence — together with its original light / dark / editorial themes.
