---
name: wbs-decomposition
summary: Hierarchical task breakdown, deliverable scoping, and 100% rule validation.
track: planning
phase: pre-code
triggers:
  - "WBS / work breakdown"
  - "task breakdown / decompose the project"
  - "deliverable scoping / work packages"
  - "100% rule"
not_for:
  - "Sequencing and dating the packages -> critical-path-mapping"
  - "Deciding whether work is in scope at all -> scope-dod-enforcer"
  - "Failure modes and risk scoring -> risk-fmea-premortem"
  - "Who does the work -> capacity-leveling"
---

# wbs-decomposition

## Single responsibility
Turn **approved scope** into a work breakdown structure: a hierarchy of project → deliverables → work
packages where every leaf is a verifiable deliverable of bounded size, validated against the 100% rule.
Decomposes *what* must be done — never *when* (calendar) or *who* (resources).

## Owns
- Hierarchy: deliverable-oriented levels; work packages sized to be estimable (bounded effort, single
  accountable owner, verifiable output artifact).
- 100% rule validation: each level fully covers its parent (no gaps) without overlap (no double
  counting); orphaned and duplicated items reported, not silently dropped.
- Deliverable scoping: every package names its output and the evidence that it is done (feeds the
  acceptance criteria owned by `scope-dod-enforcer`).
- Stable package IDs; no work item owned by two packages.

## Does not own (handoffs)
- Ordering, durations, critical path → `critical-path-mapping` (WBS packages are its nodes).
- Whether a deliverable is in scope at all → `scope-dod-enforcer`.
- Risks per package → `risk-fmea-premortem`; assignment and load → `capacity-leveling`.
