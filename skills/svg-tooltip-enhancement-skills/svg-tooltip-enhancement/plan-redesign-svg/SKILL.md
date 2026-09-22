---
name: plan-redesign-svg
description: Plan the surgical SVG-icon + accessible-tooltip enhancement of the audited project, drawing strictly on the 18 curated sources, and write plan-svg.md with 5 phases and the 5 non-negotiable guardrails.
disable-model-invocation: true
---

# plan-redesign-svg — produce plan-svg.md (5 phases + the 5 non-negotiable guardrails)

Turn the audit (and the optional Q&A) into a concrete, phase-by-plan surgical enhancement for the *existing* project — additive SVG icons and accessible tooltips with **zero layout shift** and **zero logic regression**. The output is `plan-svg.md`, which `/implement-plan-svg` then executes.

## The flow

**1. Load the inputs.** Read `svg-audit.md` (required — if it's missing, stop and ask the user to run `/audit-svg` first). Read `qna-plan-svg.md` if present.
- If `qna-plan-svg.md` is present: adopt its **icon system**, enhancement scope, in-scope features, and chosen GitHub skill.
- If it's absent: run **best-result mode** — pick the icon system (default Lucide) and the tooltip strategy (Portal default; pure CSS only where a parent is unconstrained) from the audit plus the agent's own knowledge, and record the assumption in the plan's header.
*Done when:* the audit is loaded and the icon system + tooltip strategy are chosen (from the Q&A or by best-result mode, with the choice recorded).

**2. Bind to the sources strictly.** The plan draws **only** from the 18 curated sources in `SOURCES.md` (this folder). For every planned injection, name the source(s) it comes from. A need outside the 18 is marked *outside the matrix* and sourced from the audit + the agent's own knowledge.
*Done when:* every phase in the draft cites at least one source from `SOURCES.md` (or is flagged as outside it).

**3. Write `plan-svg.md`.** Compose it from the **template** below, populating each phase with: the target **slots** (from the register), the specific injections, the sources drawn from, and a definition of done.
*Done when:* `plan-svg.md` exists with exactly **5 phases**, the **5 non-negotiable guardrails**, a recorded icon system + tooltip strategy, and per-phase sources + definitions of done.

## plan-svg.md template

`plan-svg.md` always contains these three blocks, in this order.

### Block A — header
Project · date · chosen **icon system** and **tooltip strategy** (and why) · the subset of the 18 sources the plan uses · which mode (Q&A-driven or best-result) produced it.

### Block B — the 5 non-negotiable guardrails
Write these **verbatim**; they are the contract that `/implement-plan-svg` holds itself to for every edit.

1. **Absolute logic preservation.** Preserve every React hook (`useState`, `useEffect`, `useCallback`, `useRef`, custom hooks), every prop interface, every event handler (`onClick`, `onChange`, `onKeyDown`), and every data binding verbatim — change only the visual affordance.
2. **Zero layout shift (ZLS).** Every injected SVG carries fixed bounding dimensions + `shrink-0` (`w-4 h-4`, `w-3.5 h-3.5`, or `w-5 h-5`); adding an icon to a button keeps its exact padding and size (add `inline-flex items-center gap-2` via `cn()`), so nothing shifts.
3. **Non-clipping tooltips.** Use a portal-based tooltip (Radix / Floating UI) whenever an ancestor clips (`overflow-hidden`/`auto`) or inside tables; reserve pure Tailwind group/peer CSS for unconstrained parents; always `asChild` so no extra wrapper node appears.
4. **Accessibility (a11y).** Decorative icons get `aria-hidden="true"`; icon-only controls get an unambiguous `aria-label` (with `aria-describedby` and keyboard-focus visibility per WAI-ARIA APG); tooltip text matches or complements the label.
5. **Complete, self-contained output.** Return the full updated component file with each modified element marked `/* [A11y & SVG Enhancement] */` — no `// ... rest of code` placeholders.

### Block C — the 5 phases
Each phase has: goal, target slots (from the register), the injections to apply (the detail lives in `implement-plan-svg/TRANSFORM.md`), the sources drawn from (`SOURCES.md`), and a definition of done.

1. **Foundation & tooling** — confirm the icon library and its tree-shakable imports; set the tooltip strategy; add `TooltipProvider` at the app root (portal strategy); confirm the `cn()` helper (clsx + tailwind-merge).
2. **Action buttons & interactive triggers** — leading/trailing icons on positive, destructive, and navigation buttons, dimension preservation, and hotkey/`kbd` tooltips.
3. **Data & status indicators** — `Info`/`HelpCircle` icons on metric headers with calculation explainer tooltips; semantic status-badge icons (`CheckCircle2` / `Clock` / `AlertTriangle`).
4. **Copy-to-clipboard & quick actions** — dual-state copy glyph, dynamic tooltip label, and hit-target safety.
5. **Accessibility pass & final verification** — full a11y pass (`aria-hidden`, `aria-label`, `aria-describedby`, keyboard focus + Escape), then the deployment checklist (hydration, stacking/overflow, keyboard nav, mobile/touch) and the zero-regression + zero-layout-shift check.
