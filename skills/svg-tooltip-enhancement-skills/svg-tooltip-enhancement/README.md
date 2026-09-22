# SVG Icons & Accessible Tooltips pipeline — 4 skills for Next.js / React + Tailwind

A **surgical, non-destructive** enhancement pipeline for React / Next.js + Tailwind projects: inject standard **SVG iconography** and **fully accessible tooltips** across buttons, inputs, status badges, and quick actions — with **zero layout shift** and **zero logic regression**. Four slash-command skills, run in order.

| # | Command | What it does | Output |
|---|---------|--------------|--------|
| 1 | `/audit-svg` | Read-only audit of where icons & tooltips belong | `svg-audit.md` (Icon & Tooltip Target Register) |
| 2 | `/qna-plan-svg` *(optional)* | Asks your icon system, enhancement scope, features to add, and a useful GitHub skill | `qna-plan-svg.md` |
| 3 | `/plan-redesign-svg` | Plans the enhancement, drawing **strictly** on the 18 curated sources | `plan-svg.md` (5 phases + 5 non-negotiable guardrails) |
| 4 | `/implement-plan-svg` | Implements `plan-svg.md` phase by phase, adding icons & accessible tooltips | the enhanced components |

**Run order:** `/audit-svg` → (optionally) `/qna-plan-svg` → `/plan-redesign-svg` → `/implement-plan-svg`.

If you skip `/qna-plan-svg`, `/plan-redesign-svg` runs in **best-result mode**: it picks the icon system (default Lucide) and tooltip strategy (Portal default) from the audit plus its own knowledge, and states the assumption in the plan.

## The core rule

The enhancement is **strictly additive**. Every hook, prop interface, event handler, and data binding is frozen; layout shift is zero. Only new visual affordances appear — an SVG icon (fixed size + `shrink-0`), an accessible tooltip (portal where clipping is a risk), and the a11y attributes to make both keyboard- and screen-reader-safe.

## Install

Each of the four subfolders is a skill (a folder containing `SKILL.md`). Copy all four into your skills directory, e.g.:

```
~/.agents/skills/audit-svg/
~/.agents/skills/qna-plan-svg/
~/.agents/skills/plan-redesign-svg/
~/.agents/skills/implement-plan-svg/
```

(Or with the `skills` CLI: add the repo, then install each of the four by name.)

## Contents

```
svg-tooltip-enhancement/
├── README.md
├── audit-svg/
│   └── SKILL.md
├── qna-plan-svg/
│   └── SKILL.md
├── plan-redesign-svg/
│   ├── SKILL.md
│   └── SOURCES.md        the 18 curated sources (planning draws strictly from this)
└── implement-plan-svg/
    ├── SKILL.md
    └── TRANSFORM.md      the concrete icon / tooltip / a11y recipes
```

## Notes

- **User-invoked by default** (`disable-model-invocation: true`) — each command fires only when you type it, at zero standing context cost. To let the agent offer a step unprompted, flip that flag off in that one skill.
- **Strict sources:** `/plan-redesign-svg` plans only from the 18 curated sources in `SOURCES.md` and cites them per phase; anything else is flagged as *outside the matrix*.
- **Shared state lives in the workspace** (`svg-audit.md`, `qna-plan-svg.md`, `plan-svg.md`), so the four skills install independently and hand off through those files. Artifacts are `-svg`-suffixed so they won't collide with a sibling pipeline in the same project.
