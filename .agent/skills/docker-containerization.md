---
name: docker-containerization
summary: Multi-stage lean builds, non-root runtimes, and local compose.
track: backend
phase: infra
triggers:
  - "Dockerfile"
  - "multi-stage build"
  - "non-root container / runtime user"
  - "docker compose / local stack"
  - "image size / lean image"
not_for:
  - "Provisioning where containers run (clusters, VMs, managed services) -> iac-provisioning"
  - "Ephemeral containers for test suites -> testcontainers-integration"
  - "Feature behavior of the code inside the image -> the owning build-track skill"
---

# docker-containerization

## Single responsibility
Own **container packaging and the local stack**: lean multi-stage Dockerfiles, non-root runtime users, and
a docker-compose setup that reproduces the full backend locally (app, DB, Redis, queue).

## Owns
- Multi-stage builds: deps → build (Next.js standalone / `tsc`) → minimal runtime; layer-cache discipline,
  `.dockerignore` hygiene, target image-size budgets.
- Non-root runtime: dedicated user, no privileged steps at run time, volume/socket ownership, healthchecks.
- Local compose: services with correct networks/volumes, seed hooks, deterministic ports, dev vs. prod profiles.

## Does not own (handoffs)
- Production/staging infrastructure where images run → `iac-provisioning`.
- Ephemeral test-scoped containers (Postgres/Redis per suite) → `testcontainers-integration`.
- Feature-level behavior of what runs inside → the owning build-track skill.
