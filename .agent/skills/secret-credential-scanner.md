---
id: secret-credential-scanner
description: Audit code for high-entropy keys, credentials, and private token leaks.
responsibility: Scan code, config, and history for leaked secrets — high-entropy keys, credentials, private tokens — and drive their rotation and removal.
track: core
phase: review
priority: 5
triggers:
  - "secret scan"
  - "credential leak"
  - "token audit"
  - "secret detection"
not_for:
  - "Where secrets should live and how they rotate -> iac-provisioning"
  - "Validating that required env vars exist at runtime -> env-config-validator"
  - "Application auth design/implementation -> auth-security"
---

# secret-credential-scanner

## Single responsibility
Find secrets that should not be in the repository. Scan the working tree, config files, and git
history for high-entropy keys, credentials, API keys, and private tokens; when a leak is confirmed,
drive the full response — rotate first, then purge.

## Owns
- Detection: high-entropy string analysis, known provider key formats, assignment patterns
  (`key =`, `Bearer …`), env-file and lockfile sweeps, history (commit-range) scans.
- Triage: true positive vs. fixture/sample/fake; severity by reachability and sensitivity.
- Response runbook: rotate/revoke immediately (a leaked secret is compromised even after deletion),
  purge from history if it was pushed, verify no usage remains, document the incident.

## Does not own (handoffs)
- The secret store, rotation policy, and injection paths → `iac-provisioning`.
- Startup validation that env vars exist and are typed → `env-config-validator`.
- Design/implementation of authentication → `auth-security`.
