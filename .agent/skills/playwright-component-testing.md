---
name: playwright-component-testing
track: frontend
summary: Isolated component-level test specs and mounting (no live app).
phase: test
triggers:
  - "component test spec"
  - "mount a component in isolation"
  - "unit test for a component"
  - "jsdom / vitest component test"
  - "pin a component API with tests"
not_for:
  - "E2E against the running app / real browser -> browser-use-qa"
  - "Static review of code -> web-design-reviewer"
  - "Refactoring the component API being tested -> component-composition"
---

# playwright-component-testing

## Single responsibility
Write and maintain **isolated** component-level specs: mount a single component (or minimal tree) in a test
environment — Playwright component tests or jsdom/Vitest — and assert its public contract: props → rendered
output, state transitions, event callbacks, controlled/uncontrolled behavior. No app server, no full page.

## Owns
- Spec skeletons per component: render fixtures, prop matrix, interaction assertions, failure snapshots.
- Mounting strategy: provider isolation (wrappers), mocking boundaries (network, context, clock), test ids.
- Contract pinning: a spec per public prop/behavior so refactors (e.g. by `component-composition`) are caught.

## Does not own (handoffs)
- Anything that needs the running app, routing, or a real browser → `browser-use-qa`.
- Judging component code quality statically → `web-design-reviewer`.
- The refactor that changes the API under test → `component-composition` (this skill updates the spec *after*).
