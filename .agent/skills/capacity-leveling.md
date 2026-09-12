---
name: capacity-leveling
summary: Resource constraints, workload distribution, and bottleneck elimination.
track: planning
phase: pre-code
triggers:
  - "capacity / available capacity"
  - "who can do this / resource allocation"
  - "workload balance / leveling"
  - "resource bottleneck / WIP limits"
  - "overloaded / overcommitted"
not_for:
  - "Sequencing / dating tasks -> critical-path-mapping (this skill overlays feasibility)"
  - "Defining the work to be leveled -> wbs-decomposition"
  - "Cutting work to fit capacity -> scope-dod-enforcer (decides; this skill proposes)"
  - "System performance bottlenecks (CPU, queries, heap) -> performance-benchmarking / query-optimization"
---

# capacity-leveling

## Single responsibility
Answer **"who, and is this feasible"**: model per-resource capacity (skills, availability, WIP limits),
distribute workload so nobody is chronically overcommitted, find and eliminate *resource* bottlenecks,
and feed a realistic feasibility view back into the timeline.

## Owns
- Capacity model: per-resource skill sets, availability (vacation, on-call, commitments), WIP limits.
- Leveling: workload distribution across people and time; overloads surfaced and resolved before they
  become missed deadlines; idle capacity made visible, not hidden.
- Bottleneck elimination: identify (queue behind a scarce skill, single-owner packages) and fix
  (rebalance, re-estimate, add support, pair, or recommend descope).
- Feasibility feedback: resource-constrained schedule input for `critical-path-mapping`; honest
  "this won't fit" calls with the trade options (time, scope, resources).

## Does not own (handoffs)
- The dependency graph and dates → `critical-path-mapping` (this skill supplies the constraints).
- Cutting scope to fit → `scope-dod-enforcer` decides the boundary change.
- Creating new work to fix a bottleneck (mentor/pair/unblock tasks) → `wbs-decomposition`.
- *System* bottlenecks (CPU, query, memory — not people) → `performance-benchmarking` / `query-optimization`.
