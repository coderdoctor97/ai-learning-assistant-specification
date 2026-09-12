---
id: semver-release-manager
description: Manage semantic version bumps, automated changelog generation, and git tag creation.
responsibility: Own release mechanics — semantic version bump decisions, changelog generation from commit history, and annotated git tag creation — so releases are repeatable and auditable.
track: core
phase: build
priority: 7
triggers:
  - "semver"
  - "release"
  - "changelog"
  - "version bump"
not_for:
  - "Day-to-day commit/rebase mechanics -> git-workflow-hygiene"
  - "The pipeline that ships the release -> cicd-pipeline-author"
  - "Deciding what is in the release (scope) -> scope-dod-enforcer (planning)"
---

# semver-release-manager

## Single responsibility
Ship the version. Decide the semver bump from the change set since the last tag, generate the
changelog from conventional-commit history, and cut the annotated tag — with a consistent,
repeatable procedure.

## Owns
- Version decisions: MAJOR/MINOR/PATCH from the change set (breaking changes, features, fixes),
  pre-release tags where appropriate, reasoning recorded.
- Changelog: generated from conventional commits (grouped, no noise), breaking-change callouts.
- Tags: annotated git tags, tag hygiene (one tag per release, never move a released tag), release
  verification (build matches tag, metadata correct).

## Does not own (handoffs)
- Commit/rebase mechanics that produced the history → `git-workflow-hygiene`.
- The CI job that packages and deploys the release → `cicd-pipeline-author`.
- What belongs in the release at all → `scope-dod-enforcer` (planning).
