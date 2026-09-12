---
name: browser-use-qa
track: frontend
summary: Headless real-browser verification and DOM interaction against the running app.
phase: test
triggers:
  - "verify in a real browser"
  - "headless QA / e2e"
  - "click / type / fill a live page"
  - "DOM interaction check"
  - "regression check on the running app"
not_for:
  - "Isolated component specs -> playwright-component-testing"
  - "Static code/CSS review (no execution) -> web-design-reviewer"
  - "Writing the feature itself -> build-phase skills"
---

# browser-use-qa

## Single responsibility
Verify the **running** app in a real (headless) browser: load pages, drive DOM interactions (click, type,
fill, navigate, wait for network/render), assert visible outcomes, and capture evidence (screenshots, console
errors, DOM snapshots) for regressions. This is the only skill that owns *execution-based* verification.

## Owns
- Browser sessions against the dev server (this app: `npm run dev`, bound to `0.0.0.0` for the preview proxy).
- Interaction scripts: login/session flows, stage navigation, settings round-trips, form submits end-to-end.
- Evidence capture: console/network logs, screenshots on failure, before/after DOM diffs.

## Does not own (handoffs)
- Single-component contract specs without the app → `playwright-component-testing`.
- Statically inspecting diffs/CSS without running anything → `web-design-reviewer`.
- Implementing what the check found broken → the relevant build-phase skill.
