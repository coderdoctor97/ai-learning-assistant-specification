---
id: license-compliance-audit
description: Inspect dependency licenses, detect copyleft obligations, and compile attribution notices.
responsibility: Audit the legal surface of the dependency graph — inspect dependency licenses, detect copyleft obligations, and compile attribution notices.
track: core
phase: review
priority: 14
triggers:
  - "license audit"
  - "copyleft"
  - "dependency license"
  - "attribution"
not_for:
  - "Vulnerability risk of dependencies -> security-cve-audit"
  - "Upgrading a dependency for legal reasons -> owning track skill + semver-release-manager"
  - "Where keys/secrets live -> iac-provisioning"
---

# license-compliance-audit

## Single responsibility
Keep the project legally clean. Inspect every dependency's license (direct + transitive), detect
copyleft obligations (GPL/AGPL/SSPL & co.) and their compatibility with how the project is
distributed, and compile the attribution notices the licenses require.

## Owns
- License inventory: per-dependency licenses (including dual-licensed and version-specific
  changes), manifest + lockfile coverage.
- Copyleft detection: strong/weak copyleft identification, linking vs. invocation analysis,
  distribution-model compatibility (internal tool vs. distributed product).
- Attribution: NOTICE/attribution compilation, per-license requirement checklist, change tracking
  as dependencies move.

## Does not own (handoffs)
- Vulnerability scanning of the same graph → `security-cve-audit`.
- Executing a license-forced dependency swap → owning track skill + `semver-release-manager`.
- Legal advice → out of scope (this skill produces the audit, not an opinion).
