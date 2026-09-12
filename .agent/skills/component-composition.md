---
name: component-composition
track: frontend
summary: Refactor prop drilling into compound components, slots, and context.
phase: build
triggers:
  - "prop drilling"
  - "compound component"
  - "slot pattern"
  - "refactor component API"
  - "children / composition over configuration"
not_for:
  - "Visual redesign of the component -> frontend-design (pre-code) / web-design-reviewer (post-code)"
  - "Writing/mounting tests for the new API -> playwright-component-testing"
  - "ARIA/keyboard behavior of the component -> accessibility-a11y"
---

# component-composition

## Single responsibility
Refactor **existing** component APIs that pass too many props through layers: replace boolean/variant props and
drilled state with compound components, named slots (children/`render` props), and context where state genuinely
belongs higher in the tree. The component's *behavior* stays identical — only its API shape changes.

## Owns
- Composition plans: which props become parts (`<Card.Header>`), which become slots, which move to context.
- Backward-compat strategy for the refactor (deprecation, codemods, call-site updates).
- Context boundaries: what state is shared, what stays local; provider scoping to avoid over-sharing.

## Does not own (handoffs)
- Changing how the component looks → `frontend-design` (before) or `web-design-reviewer` (after).
- The test suite that pins the new API → `playwright-component-testing`.
- Focus/ARIA semantics introduced by the new structure → `accessibility-a11y`.
