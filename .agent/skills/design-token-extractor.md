---
name: design-token-extractor
track: frontend
summary: Parse reference CSS variables and produce a starter tokens.json for the project.
phase: pre-code
triggers:
  - "extract design tokens"
  - "build tokens.json"
  - "parse reference CSS variables"
  - "pull variables from a reference site/file"
not_for:
  - "Choosing new aesthetic direction -> frontend-design"
  - "Consuming tokens inside components -> build-phase skills (e.g. component-composition)"
---

# design-token-extractor

## Single responsibility
Turn an **existing** reference (stylesheet, design-system file, or a provided page) into machine-readable
starter tokens: parse `:root`/CSS variables, deduplicate, name by convention, and emit `tokens.json`
(colors, type sizes, spacing, radii, shadows) ready to wire into the project.

## Owns
- Reference CSS variable parsing (hex/rgb/hsl normalization, alpha handling, rem→px where needed).
- Starter `tokens.json` schema: `color`, `typography`, `spacing`, `radius`, `shadow` groups with stable names.
- A short extraction report: what was found, what was missing, what was guessed (marked `inferred: true`).

## Does not own (handoffs)
- Inventing or changing the aesthetic direction → `frontend-design` (the extractor only reports gaps).
- Applying tokens to components, theming, or cascades → build-phase work.
- Conformance of token *values* (contrast ratios) → `accessibility-a11y`.
