---
name: pr-code-reviewer
summary: Pull request change audits, cyclomatic complexity checks, and code hygiene reviews.
track: core
phase: review
triggers:
  - "PR review / review the diff"
  - "cyclomatic complexity"
  - "code hygiene review"
  - "diff scope / change audit"
not_for:
  - "Mechanical lint fixes -> lint-formatting"
  - "Domain judgment: UI/UX -> web-design-reviewer; a11y -> accessibility-a11y; SQL -> query-optimization"
  - "Executing code changes -> the owning track skills"
  - "Dependency vulnerabilities -> security-cve-audit"
  - "Live verification of PR behavior -> browser-use-qa"
---

# pr-code-reviewer

## Single responsibility
Own the **generalist PR audit**: does the diff do what it claims, is it small and scoped, is the code
hygienic (naming, dead code, duplication, error handling, test presence), and does complexity stay in
bounds (cyclomatic/cognitive thresholds per function)? Reports and blocks — never edits the PR itself,
and defers domain judgment to domain skills.

## Owns
- Change audit: diff vs. stated intent, scope creep, unrelated changes mixed in, hygiene of
  migrations/secrets/generated files inside the diff.
- Complexity: cyclomatic/cognitive complexity per function, threshold policy, flagging long functions
  and deep nesting.
- Hygiene review: naming, duplication, dead code, swallowed errors, missing tests for new behavior,
  TODO rot.
- Verdict: approve / request-changes with concrete, prioritized findings — not vibes, not nitpicks at scale.

## Does not own (handoffs)
- Mechanical style/lint fixes → `lint-formatting`.
- Domain correctness: UI/UX → `web-design-reviewer`, conformance → `accessibility-a11y`,
  queries → `query-optimization`, API shape → `openapi-contract`.
- Supply-chain/dependency risk → `security-cve-audit`.
- Actually running the PR to verify behavior → `browser-use-qa` / `tdd-test-runner`.
