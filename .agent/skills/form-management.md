---
name: form-management
track: frontend
summary: React Hook Form + Zod schema-based validation for forms in this app.
phase: build
triggers:
  - "build a form"
  - "react-hook-form / RHF"
  - "Zod schema / schema-based validation"
  - "form state / dirty / touched"
  - "submit handler / form error mapping"
not_for:
  - "Form a11y contract (labels, error announcements, focus on first error) -> accessibility-a11y"
  - "Transitioning form sections in/out -> motion-and-animation"
  - "Testing the form component in isolation -> playwright-component-testing"
---

# form-management

## Single responsibility
Implement form *behavior*: wire React Hook Form, define Zod schemas as the single source of validation truth,
map schema errors into fields, manage submission/async state, and keep server-side validation (this app already
uses `zod` for API bodies) consistent with the client schema.

## Owns
- `z` schema definitions shared client/server; `useForm` wiring with resolver.
- Error mapping: schema errors → per-field messages, submit-state (idle/loading/error), reset/repopulate.
- Controlled vs. uncontrolled strategy, `watch`/`setValue` rules, dependent-field enable/disable.

## Does not own (handoffs)
- Accessible labels, `aria-describedby`/`aria-invalid` wiring, announcing errors, focus management →
  `accessibility-a11y`.
- Animating form transitions → `motion-and-animation`.
- Writing the isolated component spec for a form → `playwright-component-testing`.
