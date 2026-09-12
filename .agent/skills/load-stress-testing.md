---
id: load-stress-testing
description: Create k6 performance scripts, validate SLAs, and run concurrency stress tests.
responsibility: Load and stress the system with k6 scripts and concurrency scenarios, validating SLAs (latency, throughput, error budget) under target and peak traffic.
track: core
phase: test
priority: 10
triggers:
  - "load test"
  - "stress test"
  - "k6"
  - "SLA"
  - "performance test"
not_for:
  - "Micro-profiling / allocation analysis (no load) -> performance-benchmarking"
  - "Fixing the slow query a test exposes -> query-optimization (this skill measures)"
  - "Protecting the system under failure (breakers) -> resiliency-rate-limiting"
  - "Running the scripts in CI -> cicd-pipeline-author"
---

# load-stress-testing

## Single responsibility
Prove the system holds up under traffic. Author k6 load/stress scenarios (baseline, ramp, soak,
spike), define SLA thresholds (p50/p95/p99 latency, throughput, error rate), and run the system
against them — with a clean report of where it holds and where it breaks.

## Owns
- k6 scripts: scenarios, stages, virtual users, parameterized data, thresholds as code, reusable
  template against this repo's API surface.
- SLA validation: per-endpoint thresholds, pass/fail against the SLA, error-budget reporting.
- Stress & soak: saturation-point finding, leak detection over time (memory/CPU/connections),
  concurrency race exposure at scale.
- Reports: load curves, metric tables, regression vs. previous baseline.

## Does not own (handoffs)
- Micro-level profiling (allocations, hot paths, no load) → `performance-benchmarking`.
- Fixing the slow query the test exposes → `query-optimization`.
- Failure protection (limiters/breakers under overload) → `resiliency-rate-limiting`.
- CI wiring that runs the scripts → `cicd-pipeline-author`.
