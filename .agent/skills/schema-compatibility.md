---
id: schema-compatibility
description: Validate wire-format compatibility, protobuf backwards-compatibility, and event contract checks.
responsibility: Guard schema evolution — validate protobuf backwards-compatibility, wire-format compatibility, and event contract conformance across producer/consumer versions.
track: core
phase: review
priority: 11
triggers:
  - "schema compatibility"
  - "protobuf"
  - "wire format"
  - "event contract"
not_for:
  - "The OpenAPI REST contract itself -> openapi-contract"
  - "Database schema evolution (not wire) -> db-migrations"
  - "Generating fuzz payloads against the current contract -> api-fuzz-tester"
---

# schema-compatibility

## Single responsibility
Keep versions from breaking each other over the wire. Validate schema changes for backwards/forwards
compatibility — protobuf field rules, wire-format stability, and event-contract conformance between
producer and consumer versions.

## Owns
- Protobuf compatibility: field add/remove/reuse rules, reserved numbers, enum handling,
  well-known-types discipline; breaking-change detection on schema diffs.
- Wire-format checks: serialization stability, encoding assumptions, size/limit edges.
- Event contracts: producer/consumer schema pairs, versioning strategy, unknown-field policy,
  dual-write/deprecation windows for schema migrations.

## Does not own (handoffs)
- The REST/OpenAPI contract (shape + spec) → `openapi-contract`.
- Database schema (not wire) evolution → `db-migrations`.
- Fuzzing the current contract for breakage → `api-fuzz-tester`.
