---
name: motion-and-animation
track: frontend
summary: GSAP / Framer Motion vocabulary, timelines, and scroll-triggered physics.
phase: build
triggers:
  - "animate / animation"
  - "GSAP / ScrollTrigger"
  - "Framer Motion"
  - "spring physics / easing / timeline"
  - "scroll-triggered motion"
not_for:
  - "Static layout and composition -> frontend-design"
  - "Motion conformance audit (prefers-reduced-motion, vestibular) -> accessibility-a11y"
  - "Reviewing animation code statically -> web-design-reviewer"
---

# motion-and-animation

## Single responsibility
Implement **movement**: define the motion vocabulary for the UI (durations, easing curves, springs), build
timelines (GSAP `timeline` / Framer Motion `Variants`), and wire scroll-triggered physics
(GSAP `ScrollTrigger`, Framer Motion `useScroll`/`useTransform`) so motion is parameterized, not hardcoded.

## Owns
- Motion specs: duration/distance scales, easing + spring presets, enter/exit/whileHover/whileTap variants.
- Scroll choreography: pinning, scrub, parallax, scroll-linked progress, physics-based inertia where intended.
- Performance rules: transform/opacity-only animations, layout-animation cost, `will-change` discipline.

## Does not own (handoffs)
- Choosing *whether* a layout needs motion and its aesthetic role → `frontend-design`.
- Conformance: `prefers-reduced-motion` fallback policy, vestibular safety → `accessibility-a11y`.
- Static critique of existing animation code → `web-design-reviewer`.
