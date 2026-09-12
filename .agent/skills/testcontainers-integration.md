---
name: testcontainers-integration
summary: Ephemeral containerized test suites and DB fixtures.
track: backend
phase: test
triggers:
  - "testcontainers"
  - "integration test suite"
  - "ephemeral database / container"
  - "DB fixtures / seed data"
  - "CI test environment"
not_for:
  - "Designing the schema change under test -> db-migrations"
  - "Frontend component tests -> playwright-component-testing"
  - "Live-app browser verification -> browser-use-qa"
  - "Building the application image under test -> docker-containerization"
---

# testcontainers-integration

## Single responsibility
Own the **integration-test environment**: ephemeral containers (Postgres, Redis, queue broker) started per
suite or per test where isolation demands, plus DB fixtures/factories so tests are deterministic,
parallel-safe, and leave no state behind.

## Owns
- Suite lifecycle: testcontainers start → migrate → run → teardown; reuse vs. per-test isolation policy;
  port/network handling; CI portability.
- DB fixtures: factories, per-suite vs. per-test seeding, cleanup strategy (transaction rollback vs.
  truncate vs. fresh container).
- Test reliability: no order dependence, deterministic time/ids, documented flake budget.

## Does not own (handoffs)
- The migrations applied to ephemeral databases → `db-migrations` (this skill runs them, doesn't design them).
- Frontend testing (component mounting, live browser) → frontend test-track skills.
- Production-like infrastructure → `iac-provisioning`.
