---
name: performance-benchmarking
summary: Execution profiling, memory allocation checks, and micro-benchmarking.
track: core
phase: test
triggers:
  - "profile / profiling"
  - "benchmark / micro-benchmark"
  - "memory allocation / heap"
  - "hot path / CPU time"
  - "how slow is this exactly"
not_for:
  - "SQL / data-access performance -> query-optimization"
  - "Locating where/when a slowdown began -> debug-regression-bisect"
  - "Motion-specific perf constraints -> motion-and-animation (frontend)"
  - "Protection under load (limiters/breakers) -> resiliency-rate-limiting"
  - "Concurrency / SLA / k6 load & stress tests -> load-stress-testing"
---

# performance-benchmarking

## Single responsibility
Own **measurement of execution**: CPU/time profiling, memory allocation and heap checks, and
micro-benchmarks with controlled variables. Answers "how much / how fast / how much allocated" with
methodology that makes the number trustworthy. Does not own data-access tuning or regression root-causing.

## Owns
- Profiling: CPU flame-graph / `--prof`-style analysis, hot-path identification, async timing.
- Memory: allocation hotspots, heap snapshots, leak checks across iterations (GC-controlled).
- Micro-benchmarks: controlled harness (warmup, iteration count, variance), before/after comparison,
  regression thresholds; wiring benchmarks in as tests.
- Methodology: what not to trust (single runs, unwarmed, variable environment) and a consistent
  reporting format.

## Does not own (handoffs)
- Query/index/EXPLAIN-level data performance → `query-optimization`.
- *When/where* a slowdown crept in → `debug-regression-bisect` (this skill's numbers can serve as its oracle).
- Animation-specific performance rules (transform/opacity-only, layout cost) → `motion-and-animation`.
- Service protection under load (speed is not the goal there) → `resiliency-rate-limiting`.
