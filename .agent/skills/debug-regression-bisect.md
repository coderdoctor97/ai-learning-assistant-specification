---
name: debug-regression-bisect
summary: Stack trace debugging, issue reproduction, and git bisect analysis.
track: core
phase: review
triggers:
  - "stack trace"
  - "reproduce the issue"
  - "git bisect / find the breaking commit"
  - "regression hunt"
  - "this worked yesterday"
not_for:
  - "Measuring how slow something is -> performance-benchmarking"
  - "Rebase/commit mechanics around the fix -> git-workflow-hygiene"
  - "Producing live-browser behavioral evidence -> browser-use-qa (evidence feeds this skill)"
  - "Writing new tests for the fixed behavior -> tdd-test-runner"
  - "Static judgment about code quality -> pr-code-reviewer"
  - "Production incident process (blameless postmortem, 5-Whys) -> incident-postmortem-rca"
---

# debug-regression-bisect

## Single responsibility
Own **diagnosis**: turn a symptom (stack trace, flaky failure, "it used to work") into a *reproducible*
case, then isolate the cause — code path, config, or the exact commit via `git bisect`. Ends with a root
cause plus minimal repro; the fix itself is implemented by the owning track skill.

## Owns
- Repro: minimal failing case, environment parity, deterministic reproduction (seeded time/randomness).
- Stack trace analysis: frame attribution, async-boundary tracing, minified-source mapping.
- Bisect: `git bisect` with an automated test oracle, manual-bisect protocol for non-testable regressions,
  bisection over configs and dependencies as well as commits.
- Root-cause report: what, why, which commit/PR introduced it, blast radius.

## Does not own (handoffs)
- Measuring *how* slow a path is → `performance-benchmarking` (its numbers can serve as the bisect oracle).
- Landing the fix (commits, rebase) → `git-workflow-hygiene`.
- The fix itself → the owning track skill (`form-management`, `query-optimization`, …).
- Live-browser evidence collection → `browser-use-qa`.
