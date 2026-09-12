---
name: codebase-semantic-search
summary: Fast symbol search, AST/ripgrep queries, and architectural dependency mapping.
track: core
phase: pre-code
triggers:
  - "find the symbol / who calls this"
  - "where is X defined / used"
  - "ripgrep / AST query"
  - "dependency map / architectural coupling"
  - "what depends on module Y"
not_for:
  - "Changing anything found (this skill is read-only) -> the owning track/core skill"
  - "Root-causing a failure -> debug-regression-bisect"
  - "Measuring hot paths -> performance-benchmarking"
  - "Observing live app behavior -> browser-use-qa"
---

# codebase-semantic-search

## Single responsibility
Own **orientation**: answer "where is it, who calls it, what depends on it" fast and accurately — symbol
search, ripgrep/AST queries, and dependency/coupling mapping. Strictly read-only: produces findings and
maps, never edits code, and feeds every other skill with context.

## Owns
- Symbol/location queries: definitions, references, call sites — ripgrep for breadth, AST-level precision
  for name collisions and generics.
- Dependency mapping: module→module edges, coupling hotspots, circular dependencies, layer violations
  (e.g. UI reaching into `src/db` directly in this repo).
- Impact analysis: "if I change X, what breaks" — transitive reference sets, config and fixture touchpoints.
- Codebase maps: entry points, layering (`src/app`, `src/lib`, `src/components`, `src/db`), and the
  surfaces relevant to a given task.

## Does not own (handoffs)
- Any change to the code found → the owning track skill (or `ast-codemods` for mechanical bulk changes).
- Why something fails → `debug-regression-bisect` (this skill only locates).
- How slow something is → `performance-benchmarking`.
