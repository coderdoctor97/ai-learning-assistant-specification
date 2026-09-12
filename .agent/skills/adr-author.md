---
id: adr-author
description: Draft MADR-format Architecture Decision Records with context, options, and trade-offs.
responsibility: Draft Architecture Decision Records in MADR format — context, decision, options considered, and consequences — so architectural choices stay discoverable, justified, and reversible.
track: core
phase: pre-code
priority: 2
triggers:
  - "ADR"
  - "architecture decision"
  - "MADR"
  - "decision record"
not_for:
  - "Drawing the structure the decision adopts -> arch-diagram-generator"
  - "Threat assessment of the options -> threat-model-sast"
  - "Turning an accepted decision into work packages -> wbs-decomposition (planning)"
---

# adr-author

## Single responsibility
Record architectural decisions. Every significant "we use X instead of Y" gets a MADR-format ADR:
status, context, decision, options considered, consequences (pros/cons/follow-ups). The ADR is the
*why* — not the structure (diagrams) and not the plan (WBS).

## Owns
- MADR template application: status (proposed/accepted/deprecated/superseded), context, decision,
  options, consequences.
- ADR hygiene: one decision per ADR, stable numbering, supersede links, index maintenance.
- Option analysis: trade-offs made explicit (cost, risk, operability, reversibility) — evidence,
  not vibes.

## Does not own (handoffs)
- Diagrams inside the ADR → `arch-diagram-generator` (the ADR embeds, the generator makes).
- Threats in the decision's options → `threat-model-sast`.
- Scheduling the work the decision implies → `wbs-decomposition` + `critical-path-mapping` (planning).
