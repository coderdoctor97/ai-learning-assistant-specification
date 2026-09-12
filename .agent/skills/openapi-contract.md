---
name: openapi-contract
summary: Spec-first API scaffolding, route validation, and contract tests.
track: backend
phase: build
triggers:
  - "OpenAPI / API spec"
  - "spec-first scaffolding"
  - "validate route handlers against the spec"
  - "spec drift test / spec vs implementation check"
  - "endpoint / route shape"
not_for:
  - "Who may call an endpoint (authorization) -> auth-security"
  - "Throttling / 429 behavior on routes -> resiliency-rate-limiting"
  - "Client-side form behavior consuming the contract -> form-management (frontend)"
  - "Fuzzing / property-based contract tests and malformed payloads -> api-fuzz-tester"
---

# openapi-contract

## Single responsibility
Own the **API contract**: write the OpenAPI spec first, scaffold route handlers from it, keep implementations
in lockstep (this app parses route bodies with `zod` — the schema and the spec must never drift), and add
contract tests that fail when spec and implementation disagree.

## Owns
- OpenAPI 3.x specs: paths, schemas, error envelopes, versioning and deprecation rules.
- Spec-driven scaffolding: route handlers (Next.js route handlers) and zod schemas generated/aligned from
  the spec — the spec is the single source of truth.
- Contract tests: spec ↔ implementation assertions on request/response shapes, plus consumer checks for known clients.

## Does not own (handoffs)
- Authorization on endpoints (roles, scopes, sessions) → `auth-security`.
- Rate limits and breakers layered around routes → `resiliency-rate-limiting`.
- Frontend form wiring that consumes the contract → `form-management` (frontend track).
- Tracing/logging the request lifecycle → `otel-observability`.
