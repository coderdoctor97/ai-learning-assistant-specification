---
name: risk-fmea-premortem
summary: Failure mode identification, impact scoring, and mitigation playbooks.
track: planning
phase: pre-code
triggers:
  - "risk register / risk assessment"
  - "FMEA / failure modes"
  - "premortem / what could go wrong"
  - "RPN / impact scoring"
  - "mitigation playbook"
not_for:
  - "Applying buffers to the calendar -> critical-path-mapping (applies the buffers this skill proposes)"
  - "Deciding what stays in scope when a mitigation is 'kill the feature' -> scope-dod-enforcer"
  - "Root-causing a defect that already happened -> debug-regression-bisect"
  - "Scheduling the mitigation work -> wbs-decomposition"
---

# risk-fmea-premortem

## Single responsibility
Own **failure thinking**: enumerate failure modes per work package and phase, score them (FMEA:
severity × occurrence × detectability), run premortems, and maintain the risk register with owners and a
review cadence. Every high-score risk gets a mitigation playbook with an explicit trigger.

## Owns
- Failure-mode enumeration: per deliverable and per phase; technical, schedule, people, supply-chain
  (dependencies), and external.
- Scoring: FMEA (S×O×D = RPN) or equivalent, with thresholds that trigger playbooks; scoring rationale
  recorded, never vibes.
- Premortem: "it is X weeks from now and the project failed — write the postmortem" narrative, mined
  for failure modes.
- Risk register: id, owner, score, status, review cadence; input sources (including `security-cve-audit`
  findings); mitigation playbook = trigger condition → action → fallback.

## Does not own (handoffs)
- Applying risk buffers to the timeline → `critical-path-mapping` (this skill proposes, CP applies).
- "Kill/descope" mitigations → `scope-dod-enforcer` (boundary change), then CP re-baselines.
- Scheduling mitigation actions as work packages → `wbs-decomposition`.
- Post-hoc root cause of actual defects → `debug-regression-bisect` (outcomes feed back into the register).
