---
id: flaky-test-isolator
description: Detect flaky tests, eliminate race conditions, and sandbox test fixtures.
responsibility: Find and kill flaky tests — detect instability, eliminate race conditions, and sandbox fixtures — so the suite is deterministic and parallel-safe.
track: core
phase: test
priority: 8
triggers:
  - "flaky test"
  - "race condition"
  - "test isolation"
  - "fixture sandbox"
not_for:
  - "Designing the fixture strategy in the first place -> tdd-test-runner"
  - "Regressions in the app (not the suite) -> debug-regression-bisect"
  - "Instability observed in the live app -> browser-use-qa (evidence)"
---

# flaky-test-isolator

## Single responsibility
Make the suite trustworthy. Detect flaky tests (fail-on-rerun, order dependence, environment
sensitivity), find the race or shared state behind each, and sandbox fixtures so tests cannot see
each other. A flaky test is a broken test — fix it, don't add a rerun button.

## Owns
- Detection: rerun matrices, order-shuffle runs, time/parallelism sensitivity, per-test flake-rate
  tracking.
- Race elimination: hidden shared state (module-level, global mocks, real timers/IDs/network),
  deterministic clocks/IDs, awaiting real work instead of sleeps.
- Fixture sandboxing: per-test isolation (fresh state, scoped mocks, seeded randomness), safe
  parallelism rules.

## Does not own (handoffs)
- Designing the fixtures (what they are) → `tdd-test-runner` (this skill makes them stable).
- A regression in *app* behavior → `debug-regression-bisect`.
- Evidence of instability in the live app → `browser-use-qa`.
