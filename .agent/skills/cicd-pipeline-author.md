---
id: cicd-pipeline-author
description: Author hardened GitHub Actions workflows with caching strategies and security best practices.
responsibility: Author and harden CI/CD pipelines — GitHub Actions workflows with correct caching, least-privilege permissions, and supply-chain-safe step configuration.
track: core
phase: build
priority: 4
triggers:
  - "CI/CD"
  - "GitHub Actions"
  - "pipeline"
  - "workflow"
not_for:
  - "Day-to-day commit/rebase mechanics -> git-workflow-hygiene (different meaning of 'workflow')"
  - "Where pipeline secrets live and rotate -> iac-provisioning"
  - "The load-test scripts the pipeline runs -> load-stress-testing"
  - "Release version/tag/changelog semantics -> semver-release-manager"
---

# cicd-pipeline-author

## Single responsibility
Build the delivery pipeline. Author GitHub Actions workflows that are fast (caching) and hardened
(least privilege, pinned actions, safe checkout) covering lint/typecheck/test/build stages for this
repo (Next.js + TypeScript), with sane concurrency and failure behavior.

## Owns
- Workflow authoring: lint / typecheck / test / build jobs, matrix strategies where useful,
  required-check configuration.
- Caching: npm cache plus build-tool caches (Next.js `.next`, `tsc` incremental) keyed correctly;
  cache-bust discipline when keys go stale.
- Hardening: `permissions:` least privilege, no `pull_request_target` with untrusted-code execution,
  pinned action versions/digests, secret scoping, artifact retention.
- Pipeline ops: concurrency groups, failure triage (pipeline bug vs. code bug).

## Does not own (handoffs)
- Git history mechanics (commits, rebase) → `git-workflow-hygiene`.
- Where secrets used by the pipeline live/rotate → `iac-provisioning`.
- The k6/load-test scripts themselves → `load-stress-testing` (the pipeline just runs them).
- Version/tag/changelog *semantics* of a release step → `semver-release-manager`.
