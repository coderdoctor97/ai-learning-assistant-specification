---
name: qna-plan-svg
description: Optional pre-planning Q&A — asks your icon system, enhancement scope, features to add, and a useful GitHub skill, then writes the answers to qna-plan-svg.md for /plan-redesign-svg to use.
disable-model-invocation: true
---

# qna-plan-svg — optional design-intent Q&A before planning

Before `/plan-redesign-svg`, capture the enhancement intent so the plan is built on *your* choices rather than the agent's assumptions. Ask the questions below (the user may skip any), then write the answers to `qna-plan-svg.md`.

## The questions

Ask as one structured set; let the user skip any.

1. **Icon system & style.** Which icon library (Lucide, Heroicons, Phosphor, Tabler, Iconify, …) and look (stroke vs filled, weight, size scale `w-4` vs `w-3.5`)? If unsure, the default is Lucide.
2. **Enhancement scope.** Which element types to enhance — action buttons & interactive triggers, data & status indicators, copy-to-clipboard & quick actions, or all three — plus any specific icons or tooltip copy the user wants.
3. **Features to add.** New things the user wants (e.g., global `kbd` hotkey displays, an icon-only toolbar mode, a shared `TooltipProvider`, a custom icon set). Classify each as *additive / presentation-only* (in scope for this zero-regression enhancement) or *logic-changing* (out of scope — a real feature change, to handle separately); flag the logic-changing ones clearly.
4. **A useful GitHub skill.** Which single skill from GitHub would help during planning and implementation (an icon set, a component kit, an optimizer, a design-system tool)? If none, record "none."

## Write the answers

Save `qna-plan-svg.md` at the project root with these sections: **Icon system & style** (chosen + a line on why), **Enhancement scope**, **Features to add** (split into in-scope / out-of-scope), **GitHub skill** (name + what it's for), and any **Notes**.
*Done when:* all four question groups are answered or explicitly marked skipped, and `qna-plan-svg.md` is written and readable by `/plan-redesign-svg`.

## Scope guardrail

This pipeline is strictly additive and non-destructive: it injects icons and accessible tooltips around existing elements. Any requested feature that changes state, data flow, or event handlers is listed under *out-of-scope* and called out as a separate change — the enhancement itself never touches logic.
*Done when:* every feature request is classified in-scope or out-of-scope.
