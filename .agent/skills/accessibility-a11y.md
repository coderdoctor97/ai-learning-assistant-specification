---
name: accessibility-a11y
track: frontend
summary: WCAG 2.2 audits, focus management, and ARIA contracts.
phase: review
triggers:
  - "accessibility / a11y"
  - "WCAG 2.2 audit"
  - "ARIA roles / ARIA contract"
  - "focus order / focus trap / focus management"
  - "keyboard interaction / screen reader"
not_for:
  - "Static design/UX review of code -> web-design-reviewer"
  - "Setting the visual design -> frontend-design"
  - "Live browser interaction testing (without a11y criteria) -> browser-use-qa"
  - "Form state/validation mechanics -> form-management"
---

# accessibility-a11y

## Single responsibility
Own **conformance**: audit interfaces against WCAG 2.2, specify and verify focus management (order, traps,
restoration, first-error focus), and define ARIA contracts (roles, states, live regions) for custom
interactions. Produces conformance findings with severity and fix guidance — the only skill allowed to make
accessibility pass/fail calls.

## Owns
- WCAG 2.2 success-criteria checks: 1.4.11/1.4.13/1.4.14 (contrast, focus appearance, content on hover),
  2.1.1/2.1.2 keyboard, 2.4.x focus/location, 3.3.x error identification, 2.3.1 animation.
- Focus management plans: logical order, trapping in dialogs, focus restore on close, move-to-error on submit.
- ARIA contracts: which native element suffices vs. what needs `role`/`aria-*`/live regions; screen-reader
  expectations per interaction.

## Does not own (handoffs)
- General static design/UX review → `web-design-reviewer`.
- Implementing form mechanics → `form-management` (this skill reviews its a11y contract *after*).
- Implementing motion → `motion-and-animation` (this skill audits it *after*, incl. reduced-motion).
