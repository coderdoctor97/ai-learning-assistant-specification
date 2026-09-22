# Q&A Plan — design intent for the redesign

Captured by the `qna-plan` skill on 2026-09-22. Input to `/plan-redesign`.
Scope guardrail in force: this pipeline is a **pure-presentation refactor** — state, data flow, and side effects are frozen.

## Archetype

**Chosen: Refine the existing *editorial* direction** (custom option — not an archetype switch).

**Why:** The audit found the app already carries a mature, deliberate editorial design language — warm serif display type (Iowan Old Style / Palatino), three tokenized palettes (light / dark / **editorial** default), a full primitive token layer, and WCAG 2.2 AA geometry. Switching archetypes would discard a coherent identity; the win is a *refinement pass* that deepens the editorial voice (consistent icon craft, dialog/toast surfaces in the existing card/popover language, unified heading scale) while keeping every theme intact.

## Design work

**All 7 audit priority candidates** (`ui-ux-audit.md` §6), in severity order:

1. **Native dialogs → in-design overlays** *(high)* — replace the 5 `window.prompt`/`window.confirm` sites (Sidebar rename/delete, project delete; SettingsApp methodology delete; ProviderCard remove) with rename popovers + confirm sheets in the existing `card`/`Popover` language; mobile: bottom-sheet pattern. Handler signatures unchanged.
2. **Shared stacked toast system** *(medium)* — one toast stack replacing the two duplicated single-instance layers (StudioApp, SettingsApp); spring entrance, auto-dismiss, per-tone styling via the existing `.toast[data-tone]` tokens. `notify(kind, message)` contract preserved.
3. **Consistent icon set** *(medium)* — uniform 16px stroke set under the existing `Icon` name/API contract (22 glyphs), eliminating per-glyph stroke-weight drift. Zero call-site prop changes.
4. **`cn()` class merge** *(medium)* — introduce `cn()` (clsx + tailwind-merge) and route every concatenated/prop-passed class string through it (logic-freeze instruction #5). Zero visual delta.
5. **Data-tab KPI bento cards** *(low)* — promote the four raw stat blocks in Settings → Data to KPI-style bento cards (tabular numerics, ring borders, rounded-2xl, label/delta treatment).
6. **Heading-scale unification** *(low)* — fold raw Tailwind heading utilities (`text-2xl sm:text-3xl font-semibold tracking-tight`, `font-serif text-3xl`, `text-lg font-medium`) into the existing semantic type tokens so one token owns the scale.
7. **Landing glass polish + token cleanup** *(low)* — resolve the flat `.card-elevated` backdrop-filter over opaque contexts (true translucency over the ambient glow, or drop the filter); replace the lone `min-h-[5.5rem]` arbitrary value (NewSession.tsx:90) with a token.

## Features to add

**In scope (presentation-only):**

- **Richer loading skeletons** — shimmer on primary loading paths; skeletons that more tightly mirror final geometry (existing `.skeleton` + `StudioSkeleton`/`SettingsSkeleton` language extended, not replaced).
- **Micro-interaction pass** — unified spring press/hover feel across the remaining hand-tuned transitions; accessible focus rings already exist (verify + carry through new surfaces).
- **Better empty states** — sidebar no-match/empty history, sources empty, learning-state "not assessed", Q&A empty thread: designed placeholders in the editorial voice instead of plain muted text.

**Out of scope (logic-changing): none requested.** No state, data-flow, or side-effect changes were asked for. (If any arise during planning, they will be listed here and handled as separate changes — never inside this redesign.)

## GitHub skill

**shadcn/ui** (https://ui.shadcn.com — source #1 in the 27-source matrix).

**What it's for:** reference patterns for the copy-paste component work — dialog/sheet (candidates ①), sonner-style toast stack (②), button/badge/label API consistency (③), and `cn()` (clsx + tailwind-merge) as the canonical merge helper (④). shadcn is a copy-paste registry: no runtime package dependency is added, which keeps the zero-logic-regression contract intact.

## Notes

- All three themes (`light`, `dark`, `editorial`) and the token-first architecture (`@theme inline` in `globals.css`) must survive the pass; every new surface consumes tokens, no literal colors/sizes/timings.
- Motion stays CSS-vocabulary-driven (existing `--dur-*`/`--ease-*` tokens, reduced-motion safe, offscreen-paused); shadcn patterns are adapted to this system, not imported wholesale.
- The 27-source matrix still bounds planning: shadcn/ui (#1), Sonner (#9), Vaul (#10), Refactoring UI (#11), Steve Schoger (#12), Linear Method (#13), Geist (#14), class-variance-authority (#16), tailwind-merge & clsx (#17), W3C ARIA APG (#24) are the expected primary citations for the work above.
