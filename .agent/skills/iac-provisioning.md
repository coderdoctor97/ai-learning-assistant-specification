---
name: iac-provisioning
summary: Declarative infrastructure modules and secret management.
track: backend
phase: infra
triggers:
  - "provision infrastructure"
  - "Terraform / Pulumi / CloudFormation module"
  - "secret management / rotation"
  - "RDS / Redis / VPC / managed queue"
  - "environment (dev/staging/prod) setup"
not_for:
  - "Building container images -> docker-containerization"
  - "Ephemeral test containers -> testcontainers-integration"
  - "App-level auth logic -> auth-security (consumes the secrets this skill manages)"
  - "Limiter/breaker configuration -> resiliency-rate-limiting (uses the Redis this skill provisions)"
  - "Detecting leaked secrets in code/history -> secret-credential-scanner"
  - "12-factor / env config validation of the app -> env-config-validator"
---

# iac-provisioning

## Single responsibility
Own **declarative infrastructure**: module-organized infra-as-code (networking, managed DB, Redis, queue,
compute targets) for dev/staging/prod, plus secret management — where signing keys, DB credentials, and
provider tokens live, how they rotate, and how they're injected without ever entering the repo (this repo's
`.env` is git-ignored on purpose).

## Owns
- Declarative modules: parameterized and environment-stamped, versioned; state handled safely (locking, no
  cross-environment bleed).
- Services: VPC/network topologies, managed DB with backup policy, Redis, queue brokers, compute/container targets.
- Secret management: store selection, rotation policy, injection paths (env / secret refs), least-privilege
  access, no secrets in code, state, or logs.

## Does not own (handoffs)
- Image builds → `docker-containerization` (this skill provides where they run).
- Ephemeral test infrastructure → `testcontainers-integration`.
- What `auth-security` does with issued keys → `auth-security`.
- Limiter/breaker configuration consuming the Redis instance → `resiliency-rate-limiting`.
