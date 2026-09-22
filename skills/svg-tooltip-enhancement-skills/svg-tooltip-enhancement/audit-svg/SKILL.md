---
name: audit-svg
description: Run a read-only audit of the project in this workspace and write the Icon & Tooltip Target Register — where SVG icons and accessible tooltips belong — to svg-audit.md.
disable-model-invocation: true
---

# audit-svg — read-only audit of where SVG icons & accessible tooltips belong

Map the project's existing icon/tooltip stack, its UI **slots** (the insertion points for an icon or tooltip), its clipping traps, and its accessibility gaps into a structured **register** — the *Icon & Tooltip Target Register* — that becomes the exact input to `/plan-redesign-svg`. This command is strictly **read-only**: it inspects and reports; it writes no application code.

## The flow

**1. Stack & dependency verification.** Detect the icon libraries present (`lucide-react`, `@heroicons/react`, `@tabler/icons-react`, `@phosphor-icons/react`, or raw inline `<svg>`), the tooltip infrastructure (`@radix-ui/react-tooltip`, `@floating-ui/react`, or custom `group-hover` CSS patterns), and confirm `clsx` / `tailwind-merge`. If none is installed, record the default recommendations: `lucide-react` (or `@heroicons/react` if Tailwind is primary) plus Radix UI Tooltip.
*Done when:* the icon, tooltip, and class-merge stack is recorded from the actual files, with defaults noted if a library is absent.

**2. UI slot & visual gap analysis.** Locate the slots that need enhancement: icon-only action triggers lacking visual hierarchy; text-only buttons that would gain a leading/trailing affordance ("Download CSV", "Create New", "Delete", "Refresh"); dense table headers or form labels needing an `Info` / `HelpCircle` icon + explainer tooltip; status badges/pills needing a semantic status icon (`CheckCircle2`, `Clock`, `AlertTriangle`); and copy-to-clipboard, filter, or settings triggers needing micro-interaction states.
*Done when:* every candidate slot is listed with its location, its current snippet, and its visual deficiency.

**3. Layout & stacking trap detection.** For each slot, inspect the parent containers for `overflow-hidden` / `overflow-x-auto` / `overflow-y-scroll` or low `z-index`, and decide the **tooltip strategy**: **Portal** (bypasses clipping — the default for any clipped or table context) vs **CSS** (pure Tailwind group/peer, safe only in unconstrained parents). Flag any flex/grid parent where adding an SVG needs an explicit `shrink-0` and a `gap-x-*` to prevent text truncation or reflow.
*Done when:* every slot has a tooltip strategy (Portal or CSS) and a note on the `shrink-0`/gap it needs.

**4. Accessibility baseline audit.** Flag interactive buttons lacking an `aria-label` or accessible text; elements lacking `aria-describedby` linkage to a helper description; and raw SVGs missing `aria-hidden="true"` where they accompany visible text.
*Done when:* the accessibility prescription is written for every flagged slot.

**5. Write the register.** Save `svg-audit.md` at the project root containing the stack summary and the **Icon & Tooltip Target Register** — the markdown table below, one row per slot. No code is modified.
*Done when:* `svg-audit.md` exists with the register filled (one row per slot, every column populated) and ready to hand to `/plan-redesign-svg`.

## Register format (the table inside svg-audit.md)

| Element Ref / Location | Existing Code Snippet | Visual Deficiency & Context | Recommended SVG Icon | Recommended Tooltip Copy | Tooltip Strategy (Portal vs. CSS) | Accessibility Prescription |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| e.g., Line 42: ExportBtn | `<button onClick={onExport}>Export</button>` | Plain text, lacks visual export affordance | `Download` (Lucide) leading | "Export dataset as formatted CSV (⌘E)" | CSS (parent unconstrained) | `aria-hidden="true"` on SVG; keep text |
| e.g., Line 88: TrashAction | `<button onClick={handleDelete}><span>Del</span></button>` | Icon-only ambiguous target | `Trash2` (Lucide) | "Permanently delete record" | Portal (inside scrollable table cell) | `aria-label="Permanently delete record"`, `role="button"` |
