---
name: tdd-test-runner
summary: Test-driven development loops, unit/integration fixtures, and edge-case testing.
track: core
phase: test
triggers:
  - "TDD / test-driven development"
  - "red-green-refactor"
  - "write the test first"
  - "edge-case testing"
  - "unit / integration fixtures"
not_for:
  - "Frontend component spec content -> playwright-component-testing"
  - "Backend ephemeral test environments -> testcontainers-integration"
  - "API contract tests -> openapi-contract"
  - "API contract fuzzing / property-based payloads -> api-fuzz-tester"
  - "Flaky tests / race conditions / fixture sandboxing -> flaky-test-isolator"
  - "Verify-after in a real browser -> browser-use-qa"
  - "Hunting an existing regression -> debug-regression-bisect"
---

# tdd-test-runner

## Single responsibility
Own the **test-first loop**: red → green → refactor discipline, fixture design for unit/integration tests,
and edge-case enumeration *before* implementation. This skill owns the *process and fixtures*; domain test
skills own the spec *content* for their own layer.

## Owns
- Loop discipline: failing test first, minimal implementation, refactor only under green, commit granularity.
- Fixture strategy: factories vs. literals, shared fixture modules, per-test vs. per-suite isolation,
  deterministic time/randomness (seeded), no network in unit tests.
- Edge-case matrix per behavior: empty/boundary values, null/undefined, concurrency, failure paths, limits.
- Runner wiring: execution order hygiene (no order dependence), suite budgets, parallelism rules.

## Does not own (handoffs)
- What a component spec mounts/asserts (frontend layer) → `playwright-component-testing`.
- What the integration suite spins up (Postgres/Redis/queue) → `testcontainers-integration`.
- Spec ↔ implementation contract assertions → `openapi-contract`.
- Post-implementation verification in a live app → `browser-use-qa`.
- Locating the cause of an existing failure → `debug-regression-bisect`.
