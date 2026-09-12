---
name: ast-codemods
summary: AST-based refactoring, bulk syntax transformations, and deprecated API modernizations.
track: core
phase: build
triggers:
  - "codemod / AST transform"
  - "bulk rename / bulk syntax change"
  - "modernize deprecated API"
  - "jscodeshift / babel / codemod script"
  - "mechanical migration across N files"
not_for:
  - "Designing the target API (e.g. compound/slot shape) -> component-composition"
  - "Mechanical style-rule fixes (eslint/prettier) -> lint-formatting"
  - "Designing type contracts -> strict-typing-contracts (this skill executes bulk type migrations)"
  - "One-off hand edit in a single file -> plain coding, no skill needed"
---

# ast-codemods

## Single responsibility
Own **mechanical, bulk code transformation**: AST-based codemods that rename, move, or rewrite syntax across
many files with deterministic, reviewable diffs — including deprecated-API modernizations. A codemod never
changes semantics beyond its intended transform; every one is idempotent and dry-runnable.

## Owns
- Codemod authoring (jscodeshift/babel/SWC): visitor design, scope-aware renaming, import rewriting.
- Bulk modernizations: deprecated → current APIs, config format migrations, pattern upgrades at scale.
- Safety: dry-run + diff review, idempotency, before/after verification (typecheck + tests), and a report
  of sites the codemod could not handle (left for humans).

## Does not own (handoffs)
- *Designing* the new component/API shape the migration targets → `component-composition`
  (this skill then executes its call-site migration).
- Style/whitespace/formatting rule fixes → `lint-formatting`.
- *Designing* type contracts (this skill may *execute* a bulk type-signature migration).
- Root-causing why code misbehaves → `debug-regression-bisect`.
