---
name: frontend-design
track: frontend
summary: Aesthetic direction, typography, and layout planning in the pre-code phase.
phase: pre-code
triggers:
  - "aesthetic direction"
  - "typography scale / type system"
  - "layout planning / grid"
  - "visual hierarchy"
  - "spacing system"
  - "design a look before coding"
not_for:
  - "Extracting tokens from an existing reference -> design-token-extractor"
  - "Animation, transitions, scroll physics -> motion-and-animation"
  - "WCAG / ARIA / focus conformance -> accessibility-a11y"
  - "Reviewing existing UI or CSS -> web-design-reviewer"
---

# frontend-design

## Single responsibility
Set the visual direction **before any component code is written**: mood/palette, type scale and pairing,
layout structure (grids, breakpoints, density), spacing rhythm, and component *shape* decisions (card vs. list,
density, elevation).

## Owns
- Aesthetic direction documents: palette, tone, type scale, layout sketches (ASCII/mermaid), component inventory.
- Layout planning: grid, breakpoints, spacing tokens intent (names only — values are extracted, not invented,
  when a reference exists).
- Design decisions recorded as short ADR-style notes the build-phase skills consume.

## Does not own (handoffs)
- Parsing an existing reference site's CSS variables → `design-token-extractor`.
- Any keyframe, spring, or scroll-trigger work → `motion-and-animation`.
- Keyboard/focus/ARIA compliance → `accessibility-a11y` (audit the design *after* it is set).
- Judging code that already exists → `web-design-reviewer`.
