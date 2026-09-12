---
name: critical-path-mapping
summary: Dependency graphs, timeline estimation, and float/slack tracking.
track: planning
phase: pre-code
triggers:
  - "critical path / CPM"
  - "dependency graph / task dependencies"
  - "timeline estimation / when will this ship"
  - "float / slack"
  - "milestone projection"
not_for:
  - "Defining the work packages that become nodes -> wbs-decomposition"
  - "Likelihood/impact scoring of failures -> risk-fmea-premortem"
  - "Whether people have capacity for the sequence -> capacity-leveling"
  - "Adding or removing work -> scope-dod-enforcer"
---

# critical-path-mapping

## Single responsibility
Answer **"when"**: build the dependency graph over WBS work packages, estimate durations, find the
critical path (and near-critical paths), track float/slack per task, and maintain milestone projections.
Re-baselines the timeline when scope or reality changes. Owns the calendar — never the content of the
work or who performs it.

## Owns
- Dependency DAG: explicit predecessor/successor edges (finish-to-start by default), no hidden
  dependencies, cycle detection.
- Estimation: duration per package as point + range, with the estimation basis recorded.
- Critical path: longest path, near-critical paths, total/free float per task, slack budget.
- Milestones & re-baselining: projections, impact of completed/changed work, documented re-baseline
  when variance is structural rather than noise.
- Risk buffers: applying the buffers proposed by `risk-fmea-premortem` to the timeline.

## Does not own (handoffs)
- What the nodes are (work packages) → `wbs-decomposition`.
- Why a package might fail (probability/impact) → `risk-fmea-premortem`.
- Whether the sequence is feasible per person → `capacity-leveling` (overlays the resource view on this graph).
- Adding/removing packages → `scope-dod-enforcer` first.
