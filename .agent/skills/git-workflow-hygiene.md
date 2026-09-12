---
name: git-workflow-hygiene
summary: Atomic git commits, conventional commit syntax, and rebase issue resolution.
track: core
phase: build
triggers:
  - "commit message / conventional commits"
  - "atomic commit / commit granularity"
  - "rebase conflict / rebase problem"
  - "squash / cherry-pick / branch hygiene"
not_for:
  - "Finding which commit broke a regression -> debug-regression-bisect (analysis, not mechanics)"
  - "Judging PR content -> pr-code-reviewer"
  - "Secret handling policy -> iac-provisioning (secrets never enter commits)"
  - "Release / version / tag / changelog mechanics -> semver-release-manager"
  - "CI/CD pipeline authoring -> cicd-pipeline-author"
---

# git-workflow-hygiene

## Single responsibility
Own **how work lands**: atomic, well-scoped commits with conventional-commit messages, clean branch state,
and rebase/conflict resolution that preserves intent. Git mechanics and discipline only — never a judgment
on whether the code is good.

## Owns
- Commit hygiene: one logical change per commit, atomic diffs, `type(scope): summary` conventional syntax
  with justified bodies, no WIP garbage left in history.
- Branch hygiene: rebase onto target, conflict resolution by reasoning about intent (never blind
  theirs/ours), linear history, no force-push accidents.
- Change assembly: squash/fixup workflows, cherry-picking across branches, staging discipline —
  generated files, DB files, and secrets never committed (this repo's `.gitignore` is the contract).

## Does not own (handoffs)
- *Which* commit introduced a regression → `debug-regression-bisect`.
- Whether the diff is good → `pr-code-reviewer` (and the owning domain skills).
- Where credentials/secrets live and rotate → `iac-provisioning`.
