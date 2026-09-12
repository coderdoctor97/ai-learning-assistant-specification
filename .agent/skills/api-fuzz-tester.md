---
id: api-fuzz-tester
description: Generate property-based API contract tests, schema fuzzing payloads, and edge-case validators.
responsibility: Fuzz API surfaces with property-based contract tests, schema fuzzing payloads, and edge-case validators to break contracts before users do.
track: core
phase: test
priority: 6
triggers:
  - "API fuzz"
  - "contract test"
  - "schema fuzzing"
  - "property-based test"
not_for:
  - "Deterministic spec vs implementation shape assertions -> openapi-contract"
  - "Evolution/compatibility of wire formats over versions -> schema-compatibility"
  - "Unit-level TDD loop on code -> tdd-test-runner"
  - "Correctness fuzzing at traffic scale -> load-stress-testing"
---

# api-fuzz-tester

## Single responsibility
Break the API on purpose. Generate property-based tests and fuzzing payloads (malformed, oversized,
type-mismatched, boundary, hostile-Unicode) against API schemas and endpoints, and turn every break
into a minimal, reproducible failing case.

## Owns
- Property-based tests: invariants that must hold (valid input never yields 5xx; response always
  matches schema), with shrinking to minimal counterexamples.
- Schema fuzzing: payload generation from the schema — malformed JSON, wrong types, boundary
  lengths, injection-shaped strings, nested-depth bombs.
- Edge-case validators: required/optional matrices, encoding/charset edges, concurrency on shared
  state where the API exposes it.

## Does not own (handoffs)
- Deterministic spec↔implementation contract assertions (pin the contract) → `openapi-contract`.
- Cross-version wire compatibility (protobuf/event evolution) → `schema-compatibility`.
- Code-level TDD loops → `tdd-test-runner`.
- Load/concurrency at scale (throughput, not correctness) → `load-stress-testing`.
