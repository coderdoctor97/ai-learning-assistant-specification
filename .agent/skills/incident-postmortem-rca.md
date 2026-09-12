---
id: incident-postmortem-rca
description: Author blameless postmortems, conduct 5-Whys root cause analysis, and define preventive actions.
responsibility: Run the incident process — author blameless postmortems, conduct 5-Whys root cause analysis, and define tracked preventive actions — so incidents produce durable system improvements.
track: core
phase: review
priority: 13
triggers:
  - "postmortem"
  - "incident review"
  - "5-Whys"
  - "RCA"
  - "root cause"
not_for:
  - "Code-level regression diagnosis (find the breaking commit) -> debug-regression-bisect"
  - "Prospective failure-mode analysis (before the incident) -> risk-fmea-premortem (planning)"
  - "Implementing the fix or preventive action -> the owning track skill"
---

# incident-postmortem-rca

## Single responsibility
Turn incidents into system improvements. Author blameless postmortems (timeline, impact, detection,
response), drive 5-Whys/root-cause analysis to the systemic cause, and land tracked preventive
actions with owners — no individual blame, no action list that dies in a document.

## Owns
- Timeline reconstruction: from logs/traces/chat; detection-to-resolution; detection gaps.
- 5-Whys / RCA: chain to systemic causes (process, monitoring, design), not "someone misclicked";
  contributing factors kept distinct from root cause.
- Blameless framing: facts and system behavior, never actors.
- Preventive actions: concrete, owned, time-boxed (fix, monitor, test, doc), tracked to closure,
  feeding the risk register.

## Does not own (handoffs)
- Finding the breaking commit in a regression → `debug-regression-bisect`.
- Prospective failure modes → `risk-fmea-premortem` (planning).
- Executing fixes/preventive actions → owning track skill; scheduling → `wbs-decomposition`.
