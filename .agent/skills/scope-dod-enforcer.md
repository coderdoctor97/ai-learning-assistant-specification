---
name: scope-dod-enforcer
summary: Boundary definition, acceptance criteria, and anti-scope-creep validation.
track: planning
phase: pre-code
triggers:
  - "scope / in scope / out of scope"
  - "definition of done / DoD"
  - "acceptance criteria"
  - "scope creep / is this in scope"
  - "scope change request"
not_for:
  - "Decomposing approved scope into packages -> wbs-decomposition"
  - "Timing the approved scope -> critical-path-mapping"
  - "Code-level quality gates -> pr-code-reviewer (executes DoD items, does not own the criteria)"
  - "Writing the tests that prove acceptance -> tdd-test-runner"
---

# scope-dod-enforcer

## Single responsibility
Own **boundaries and "done"**: define explicit in/out-of-scope per deliverable, write testable
acceptance criteria and a Definition of Done per work package, and enforce both at every gate. The single
authority for "is this supposed to be built, and is this actually finished". Active from pre-code through
delivery — not just a one-time up-front document.

## Owns
- Boundary definition: in/out lists per deliverable, explicit non-goals, assumptions and constraints.
- Acceptance criteria & DoD: testable criteria per package; the project DoD (tests green, review
  passed, docs, deployable) — the criteria are owned here and *executed* by core skills.
- Scope-change intake: every new request gets an impact assessment (scope, time, resources) and an
  explicit approve / defer / kill decision — no silent absorption.
- Anti-scope-creep validation: at each gate, diff the request or PR against the boundary and flag drift
  against the specific criterion it violates.

## Does not own (handoffs)
- Decomposing approved scope → `wbs-decomposition`; re-baselining the timeline after a change →
  `critical-path-mapping`.
- Resourcing impact of a change → `capacity-leveling`.
- The code-level checks themselves (lint, tests, review) → `pr-code-reviewer` / `tdd-test-runner` /
  `lint-formatting`.
- Failure modes introduced by scope cuts → `risk-fmea-premortem`.
