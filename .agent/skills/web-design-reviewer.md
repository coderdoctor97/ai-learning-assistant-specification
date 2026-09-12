---
name: web-design-reviewer
track: frontend
summary: Static UI inspection, CSS linting, and UX code review (no execution).
phase: review
triggers:
  - "design review of existing code"
  - "review the UI / UX review"
  - "CSS lint / style review"
  - "inspect a component's styling"
  - "visual consistency check on a diff"
not_for:
  - "WCAG / ARIA / focus conformance -> accessibility-a11y"
  - "Running the app or a real browser -> browser-use-qa"
  - "Setting new aesthetic direction -> frontend-design"
  - "Writing tests -> playwright-component-testing"
---

# web-design-reviewer

## Single responsibility
Critique **existing** UI code statically: read the diff/files, run CSS linting (ESLint/Tailwind config,
specificity and selector smells, utility vs. custom-class discipline), and review UX implementation choices
(spacing, contrast intent, naming, state coverage: hover/focus/disabled/empty/error) **without executing the
app** and without judging WCAG conformance.

## Owns
- Static inspection checklist: state coverage, visual hierarchy in code, token usage (values come from
  `tokens.json`, not literals), responsive behavior in media/variant logic, dead/overridden CSS.
- CSS linting pass with concrete fix suggestions (not blind auto-formatting).
- UX code review: naming, component API readability, inconsistent patterns across the tree.

## Does not own (handoffs)
- Conformance verdicts (WCAG 2.2, ARIA contracts, focus order) → `accessibility-a11y`.
- Evidence that requires rendering the app → `browser-use-qa`.
- Choosing what the UI should look like in the first place → `frontend-design`.
