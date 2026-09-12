---
name: lint-formatting
summary: Linter auto-fixes, code style enforcement, and static analysis remediation.
track: core
phase: review
triggers:
  - "lint / eslint / autofix"
  - "code style / formatting / prettier"
  - "static analysis remediation"
  - "CI lint gate failing"
not_for:
  - "Semantic / bulk transformations -> ast-codemods"
  - "Compile-time type error resolution -> strict-typing-contracts"
  - "UX/design judgment on code -> web-design-reviewer (frontend)"
  - "Judgment-based PR audit -> pr-code-reviewer"
  - "Vulnerabilities in dependencies -> security-cve-audit"
---

# lint-formatting

## Single responsibility
Own **mechanical code hygiene**: run and remediate linters/formatters (this repo: ESLint flat config,
`eslint-config-next`, `npm run lint`), enforce style rules, and clear static-analysis findings the
*rules* cover. Machine verdict, mechanical fix — no design judgment, no semantic rewrites.

## Owns
- Lint runs + autofix (`--fix`), scoped to the diff where possible; full-tree cleanup on request.
- Style enforcement: formatting, naming per config, import order, rule-based unused-code removal.
- Static-analysis remediation: rule-by-rule fix, or a documented disable with a reason — never a silent
  `eslint-disable`.
- Gate health: `npm run lint` green; no rule suppressed without justification.

## Does not own (handoffs)
- Semantic refactors / bulk transforms → `ast-codemods`.
- Compile-time type errors → `strict-typing-contracts`.
- Whether the UI/UX is good → `web-design-reviewer` (frontend); whether the PR is sound → `pr-code-reviewer`.
- Vulnerabilities in *dependencies* (vs. code rules) → `security-cve-audit`.
