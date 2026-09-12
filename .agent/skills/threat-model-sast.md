---
id: threat-model-sast
description: Perform STRIDE/OWASP threat assessments and secure design validation.
responsibility: Assess threats to designs and code using STRIDE and OWASP frameworks, validate secure-design properties, and track findings to remediation.
track: core
phase: pre-code
priority: 3
triggers:
  - "threat model"
  - "STRIDE"
  - "OWASP"
  - "security assessment"
not_for:
  - "Vulnerabilities shipped inside dependencies -> security-cve-audit"
  - "Implementing auth/session/RBAC mechanics -> auth-security"
  - "Secrets already leaked in code -> secret-credential-scanner"
  - "License risk in a security library -> license-compliance-audit"
---

# threat-model-sast

## Single responsibility
Find threats *by design*. Apply STRIDE (Spoofing, Tampering, Repudiation, Information disclosure,
Denial of service, Elevation of privilege) and the OWASP catalogs to designs, data flows, and code,
and verify that claimed secure-design properties actually exist in the implementation.

## Owns
- Threat modeling: trust boundaries, data-flow diagrams as input, a STRIDE table per boundary, OWASP
  mapping (Top-10 / ASVS where relevant).
- Secure-design validation: claims checked against the implementation ("validated server-side?" —
  verified, not trusted from the doc).
- Findings: severity, affected component, recommended control, remediation tracking.

## Does not own (handoffs)
- CVEs in the dependency graph → `security-cve-audit` (its findings feed the threat picture).
- Implementing auth/session/RBAC controls → `auth-security`.
- Removing a leaked credential discovered in review → `secret-credential-scanner`.
- License obligations on a security dependency → `license-compliance-audit`.
