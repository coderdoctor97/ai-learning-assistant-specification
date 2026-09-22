# plan.md — Surgical SVG Icon & Accessible Tooltip Enhancement Plan

## Block A — Header

- **Project:** `ai-learning-studio` (Learning Studio) — Next.js 16.2.6 App Router, React 19.2.6, Tailwind v4.1.17
- **Date:** 2026-09-22
- **Chosen Icon System:** **Enhanced Custom `Icon.tsx`** — clean 1.5px stroke icons with `currentColor`, round linecaps/joins, optically centered on a 16×16 canvas scale (`w-4 h-4` / `w-3.5 h-3.5` default, `shrink-0`), expanding `src/components/ui/Icon.tsx` following official Lucide React stroke design standards.
- **Chosen Tooltip Strategy:** **Hybrid Strategy (Portal Default + Pure CSS for Unconstrained Parents)** — Top-level `<TooltipProvider>` with portal rendering (`@radix-ui/react-tooltip` or custom Portal-backed tooltip component) for all slots inside constrained or scrollable containers (`w-14` / `w-72` sidebar rail, scrollable stage deck, popover dropdowns, attachment lists, step editor lists). Pure Tailwind CSS group/peer tooltips for unconstrained topbar/stage footer elements.
- **Mode:** **Q&A-Driven Mode** (recorded from `qna-plan-svg.md` and `svg-audit.md`).
- **Enhancement Scope:** All 3 target scopes (36 audited slots across action triggers, data/status indicators, and quick actions/clipboard micro-interactions).

**Sources used from the 18-source matrix:**

| # | Source | Used in |
|---|--------|---------|
| 1 | Lucide React | Phase 1–5 (Icon design standards, 1.5px stroke glyphs, `currentColor`, `shrink-0` geometry) |
| 2 | Radix UI Tooltip | Phase 1–5 (Headless portal tooltip primitive, `TooltipProvider`, `TooltipTrigger`, `TooltipContent`) |
| 9 | W3C WAI-ARIA APG Tooltip Pattern | Phase 1–5 (`aria-describedby` linking, keyboard focus, Escape dismissal) |
| 13 | tailwind-merge | Phase 1–5 (Resolving class conflicts during class composition) |
| 14 | clsx | Phase 1–5 (`cn()` helper for conditional class merging) |
| 15 | Radix UI Slot (`asChild`) | Phase 1–5 (Merging tooltip props onto existing child element without extra DOM wrappers) |
| 18 | Tailwind Hover/Focus/Group/Peer | Phase 1–5 (`data-[state=open]:rotate-180`, `animate-spin`, `:focus-visible` ring modifiers) |

> **Outside the matrix:** None. All planned injections cite sources from `SOURCES.md`.

---

## Block B — The 5 non-negotiable guardrails

1. **Absolute logic preservation.** Preserve every React hook (`useState`, `useEffect`, `useCallback`, `useRef`, custom hooks), every prop interface, every event handler (`onClick`, `onChange`, `onKeyDown`), and every data binding verbatim — change only the visual affordance.
2. **Zero layout shift (ZLS).** Every injected SVG carries fixed bounding dimensions + `shrink-0` (`w-4 h-4`, `w-3.5 h-3.5`, or `w-5 h-5`); adding an icon to a button keeps its exact padding and size (add `inline-flex items-center gap-2` via `cn()`), so nothing shifts.
3. **Non-clipping tooltips.** Use a portal-based tooltip (Radix / Floating UI) whenever an ancestor clips (`overflow-hidden`/`auto`) or inside tables; reserve pure Tailwind group/peer CSS for unconstrained parents; always `asChild` so no extra wrapper node appears.
4. **Accessibility (a11y).** Decorative icons get `aria-hidden="true"`; icon-only controls get an unambiguous `aria-label` (with `aria-describedby` and keyboard-focus visibility per WAI-ARIA APG); tooltip text matches or complements the label.
5. **Complete, self-contained output.** Return the full updated component file with each modified element marked `/* [A11y & SVG Enhancement] */` — no `// ... rest of code` placeholders.

---

## Block C — The 5 phases

### Phase 1 — Foundation & Tooling

**Goal:** Establish the foundation for accessible tooltips and SVG icons without changing application logic or layout behavior.

**Target Components:**
- `src/components/ui/Icon.tsx` — Expand glyph paths to support standard Lucide stroke glyphs (`panelLeftOpen`, `panelLeftClose`, `plusSquare`, `folderPlus`, `trash2`, `moreHorizontal`, `checkCircle2`, `alertTriangle`, `bot`, `brain`, `refreshCw`, `pencil`, `rotateCw`, `maximize2`, `minimize2`, `paperclip`, `fileText`, `archive`, `fileSpreadsheet`, `fileDown`, `code2`, `eye`, `keyRound`, `arrowUp`, `arrowDown`).
- `src/components/ui/Tooltip.tsx` — Create accessible headless floating tooltip primitive (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`) using Portal rendering to `document.body` and `asChild` delegation.
- `src/app/layout.tsx` & `src/components/studio/StudioApp.tsx` & `src/components/settings/SettingsApp.tsx` — Wrap app root in `<TooltipProvider>`.
- `src/lib/cn.ts` — Confirm `cn()` helper (`clsx` + `tailwind-merge`).

**Injections & Transformations:**
- Add missing SVG stroke paths to `Icon.tsx` ensuring consistent 1.5px stroke width, round linecap/join, optical centering, and `aria-hidden="true"`.
- Implement `Tooltip` primitive with `delayDuration={200}`, `sideOffset={5}`, Portal rendering, and keyboard Escape dismissal.

**Sources Drawn From:** #1, #2, #9, #13, #14, #15.

**Definition of Done:** `TooltipProvider` wraps the app; `Icon.tsx` contains all required glyph paths; `npm run typecheck` passes with zero errors; no component logic or layout affected.

---

### Phase 2 — Action Buttons & Interactive Triggers

**Goal:** Enhance all primary, secondary, and icon-only interactive action triggers with clear SVG icon affordances and accessible tooltips.

**Target Slots (from audit register):**
- **Sidebar Rail Expand/Collapse:** `Sidebar.tsx:189` (`panelLeftOpen`) & `Sidebar.tsx:232` (`panelLeftClose`) with "Expand sidebar (⌘B)" / "Collapse sidebar (⌘B)" portal tooltips.
- **Sidebar New Session:** `Sidebar.tsx:200` (`plusSquare`) in rail with portal tooltip "Create new learning session (⌘N)" & `Sidebar.tsx:243` (`plus` leading `shrink-0`) in panel.
- **Sidebar Add/Delete Project:** `Sidebar.tsx:261` (`folderPlus`) & `Sidebar.tsx:314` (`trash2`).
- **Sidebar Session More Menu:** `Sidebar.tsx:123` (`moreHorizontal`) with portal tooltip "Session options".
- **TopBar Model Picker Dropdown:** `TopBar.tsx:232` (`chevronDown` with `shrink-0 transition-transform data-[state=open]:rotate-180`).
- **TopBar Toggles:** `TopBar.tsx:301` (`bot` / `sparkles` leading icon on Dynamic Agent toggle) & `TopBar.tsx:313` (`brain` / `lightbulb` leading icon on Reasoning toggle).
- **Stage Meta Prompt Edit:** `StageMeta.tsx:32` (`pencil` leading `shrink-0`).
- **Composer Submit Button:** `Composer.tsx:28` (`send` / `cornerDownLeft` leading `shrink-0`) with tooltip "Send question (⌘+Enter)".
- **Attachment Trigger:** `AttachmentRow.tsx:33` (`paperclip` / `upload`) with supported formats tooltip.

**Injections & Transformations:**
- Wrap each trigger in `<Tooltip content="..." strategy="portal|css">`.
- Inject `shrink-0` SVG icons into buttons via `cn("inline-flex items-center gap-2", className)`.
- Mark each updated element with `/* [A11y & SVG Enhancement] */`.

**Sources Drawn From:** #1, #2, #9, #13, #14, #15, #18.

**Definition of Done:** All interactive triggers show crisp icons and focus/hover tooltips; dimensions and alignment stay pixel-exact (zero layout shift); all event handlers (`onClick`, `onKeyDown`) function verbatim.

---

### Phase 3 — Data & Status Indicators

**Goal:** Equip status badges, model capability chips, progression step dots, and disclosure headers with semantic SVG status icons and contextual explainer tooltips.

**Target Slots (from audit register):**
- **Provider Status Chip:** `TopBar.tsx:217` — Replace bare CSS LED dot with semantic SVG icon (`checkCircle2` for connected, `alertTriangle` for error, `circle` for disconnected) + tooltip "Provider status: [Name], [Status]".
- **Clamped Context Warning Chip:** `TopBar.tsx:291` — Add leading `alertTriangle` SVG icon + explainer tooltip "Active model context limit is lower than selected level".
- **Theme Switcher Radios:** `TopBar.tsx:332` — Add tooltips "Switch theme: Light / Dark / Editorial".
- **Progression Step Rail Pills:** `StageToolbar.tsx:76` — Replace text checkmark `"✓"` with `check` SVG icon in step dot + portal tooltip "Stage [N]: [Title] — [Instructions]".
- **Section Disclosure Accordions:** `Collapsible.tsx:20` — Add category SVG icons (`brain` for Reasoning, `bookOpen` for Sources, `activity` for Learning State) and smooth chevron rotation `data-[state=open]:rotate-180`.
- **Methodology Selection Cards:** `NewSession.tsx:143` — Add visual selection radio checkmark (`checkCircle2` / `circle`).

**Injections & Transformations:**
- Insert semantic SVG status icons with `aria-hidden="true"`.
- Attach accessible tooltips explaining status details.
- Retain all state bindings (`aria-pressed`, `aria-current`, `aria-expanded`).

**Sources Drawn From:** #1, #2, #9, #15, #18.

**Definition of Done:** Data/status indicators display clear, accessible visual cues and explainer tooltips; screen reader accessibility attributes verified.

---

### Phase 4 — Copy-to-Clipboard & Quick Actions

**Goal:** Add stateful micro-interactions (spinning refresh icons, temporary copy success checkmark feedback, format-specific export icons).

**Target Slots (from audit register):**
- **Copy Stage Content & Answer:** `StageDeck.tsx:186` & `QaThread.tsx:65` — Transition SVG icon from `copy` to `check` for 2s upon copy action + tooltip "Copy to clipboard".
- **Regenerate & Refresh Buttons:** `StageDeck.tsx:190`, `QaThread.tsx:74`, `TopBar.tsx:263`, `ProviderCard.tsx:247` — Add `animate-spin` CSS class on `rotateCw` / `refreshCw` icon when `busy` / `aria-busy` is true.
- **Stage Modifier Buttons:** `StageDeck.tsx:198` — Add leading SVG icons (`maximize2` for Longer, `minimize2` for Shorter, `sparkles` for Deeper) + tooltip explaining Reasoning requirement for Deeper.
- **Export Format Buttons:** `ExportBar.tsx:22` — Map format to specific SVG icons: `fileText` (MD/TXT), `archive` (ZIP), `fileSpreadsheet` (DOCX), `fileDown` (PDF), `code2` (HTML).
- **Clear & Remove Actions:** `ProviderCard.tsx:167` (`keyRound`), `ProviderCard.tsx:214` (`trash2`), `AttachmentRow.tsx:65` (`trash2`), `SettingsApp.tsx:136` (`arrowUp` / `arrowDown`).

**Injections & Transformations:**
- Implement 2s copy success icon swap (`copy` → `check`).
- Apply `animate-spin` on active refresh/discovery states.
- Assign format-specific export SVG icons.

**Sources Drawn From:** #1, #2, #9, #13, #14, #18.

**Definition of Done:** Copy buttons provide instant checkmark visual feedback; refresh buttons spin when active; export formats show distinct icons; no logic modified.

---

### Phase 5 — Accessibility Pass & Final Verification

**Goal:** Complete WAI-ARIA compliance check, keyboard focus verification, zero-layout-shift validation, and build/typecheck pass.

**Verification Checklist:**
1. **ARIA Attributes:** All decorative SVGs have `aria-hidden="true"`; all icon-only buttons have explicit `aria-label`; tooltips linked via `aria-describedby`.
2. **Keyboard Focus & Escape:** All tooltips appear on `:focus-visible` and dismiss on `Escape`.
3. **Zero Layout Shift:** Bounding dimensions (`w-4 h-4`, `shrink-0`) verified on every injected SVG.
4. **Clipping & Portal Verification:** All tooltips inside scrollable containers render in portals without being cut off.
5. **Regression Verification:** Run `npm run typecheck` and `npm run lint`.

**Sources Drawn From:** #1, #2, #9, #13, #14, #15, #18.

**Definition of Done:** All 36 target slots audited, enhanced, and verified; zero logic changes; typecheck and build pass cleanly.
