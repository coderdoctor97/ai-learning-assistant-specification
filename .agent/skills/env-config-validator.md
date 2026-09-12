---
id: env-config-validator
description: Audit 12-factor configuration compliance, guard missing env vars, and validate config types.
responsibility: Make configuration safe — audit 12-factor compliance, fail fast on missing or malformed env vars, and validate config types at startup.
track: core
phase: review
priority: 15
triggers:
  - "12-factor"
  - "env validation"
  - "configuration audit"
  - "missing env var"
not_for:
  - "Where config values / secrets are sourced and injected -> iac-provisioning"
  - "Detecting leaked secrets in code/history -> secret-credential-scanner"
  - "Zod runtime validation of request payloads -> openapi-contract / form-management"
---

# env-config-validator

## Single responsibility
Make configuration fail loudly, not silently. Audit the app against 12-factor config principles, add
startup guards for required env vars (missing/empty → clear error), and validate the type/range of
every setting — one zod-validated config object, no scattered `process.env` reads.

## Owns
- 12-factor audit: config in env (not code), no hidden state in config, consistent dev/prod
  configuration handling, `.env` discipline per this repo's gitignore.
- Startup validation: single config module, zod schema over the env, typed access, explicit
  required/optional with defaults documented.
- Guards: fail-fast with actionable messages (which var, where expected), no silent fallbacks that
  mask misconfiguration.

## Does not own (handoffs)
- Sourcing/rotation/injection of values → `iac-provisioning`.
- Leaked secret values found in the repo → `secret-credential-scanner`.
- Validating *request* payloads (zod at the wire) → `openapi-contract` / `form-management`.
