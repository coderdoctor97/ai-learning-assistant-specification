---
name: implement-plan-svg
description: Implement the existing plan-svg.md — run its 5 phases under the 5 non-negotiable guardrails, adding SVG icons and accessible tooltips with zero layout shift and zero logic regression.
disable-model-invocation: true
---

# implement-plan-svg — execute plan-svg.md phase by phase, additive only

Take the existing `plan-svg.md` and implement its 5 phases, injecting **only** SVG icons and accessible tooltips while the 5 non-negotiable guardrails hold. The concrete recipes live in `TRANSFORM.md` (this folder).

## The flow

**1. Load the plan and the contract.** Read `plan-svg.md` (required — if it's missing, stop and ask the user to run `/plan-redesign-svg` first). Extract the **5 non-negotiable guardrails** (Block B) and the **5 phases** (Block C). Load `TRANSFORM.md` for the recipes. The guardrails are the operating rule for every edit: logic is preserved, layout shift is zero, tooltips never clip, a11y is complete, and each file is returned whole.
*Done when:* the contract and the 5 phases are loaded, and the frozen logic (hooks, handlers, data bindings) is named as the boundary.

**2. Run the phases in order (1 → 5).** For each phase:
- Pick its target **slots** from `plan-svg.md`.
- Apply the injections using the matching `TRANSFORM.md` recipes (icon sizing + `shrink-0`, the chosen tooltip strategy, the per-type recipe, the a11y rules).
- Keep every change additive and inside the visual layer, and route all class composition through `cn()`.
- **Verify the phase:** the diff for the phase's slots is additive-only — no hook, handler, or data binding changed, and no layout shift. Check against the phase's definition of done.
*Done when:* all 5 phases are implemented and each phase's definition of done is met.

**3. Final deployment pass.** Run the Phase 5 checklist: zero hydration-mismatch warnings; tooltips float freely over sticky headers and clipped containers without layout jumping; tooltips open on `focus-visible` and close on Escape; touch devices handle tap-to-inspect gracefully. Confirm zero logic regression and zero layout shift, then report what was added (icons, tooltips, a11y attributes) and confirm nothing logic-related moved.
*Done when:* all 5 phases are done and the final deployment checklist passes — icons and accessible tooltips added, logic and layout untouched.
