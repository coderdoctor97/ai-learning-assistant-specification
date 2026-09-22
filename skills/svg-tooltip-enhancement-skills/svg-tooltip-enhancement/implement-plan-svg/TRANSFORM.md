# TRANSFORM recipes

The concrete surgical injections `implement-plan-svg` applies, grouped by type. This is the *how*. The *where* (which slots, which phase) comes from `plan-svg.md`, and the *boundary* (what must not move) comes from `plan-svg.md`'s 5 non-negotiable guardrails.

## Icon injection rules (ZLS)
- Fixed bounding box + `shrink-0` on every injected SVG: `w-4 h-4 shrink-0` (default), `w-3.5 h-3.5 shrink-0` (compact/table), `w-5 h-5 shrink-0` (large triggers). Never an unconstrained SVG.
- Adding an icon to a button that has no gap utility: add `inline-flex items-center gap-2` (or `gap-1.5`) via `cn()`, keeping the button's existing padding and dimensions exactly.
- Icons inherit color via `stroke="currentColor"` (Lucide) or the library's native color inheritance — add an explicit `text-*` only when a semantic color is intended.

## Tooltip Strategy A — Portal (default)
Use whenever an ancestor has `overflow-hidden` / `overflow-x-auto` / `overflow-y-scroll`, inside tables, or under sticky headers.
- Wrap the trigger: `TooltipProvider` → `Tooltip` → `TooltipTrigger asChild` (always `asChild` so no extra `<button>`/`<div>` is injected).
- Content: `<TooltipContent sideOffset={4} className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 select-none">…</TooltipContent>`
- Radix or Floating UI; confirm the app root hosts the `TooltipProvider`.

## Tooltip Strategy B — Tailwind group/peer CSS
Only safe in non-overflow-clipped, static containers.
- Wrap the trigger in a `relative inline-flex group` container.
- Bubble: `<span role="tooltip" className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 rounded bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap shadow z-50">…</span>`

## Action buttons & interactive triggers (Sub-Prompt A)
- Positive/submission ("Save", "Submit", "Publish"): leading `Check` or `Send` (`w-4 h-4 shrink-0`).
- Destructive ("Delete", "Discard", "Revoke"): leading `Trash2` or `AlertCircle` (`w-4 h-4 shrink-0 text-red-500 group-hover:text-red-600`).
- Navigation/external ("View Docs", "Open in New Tab"): trailing `ExternalLink` or `ArrowRight` (`w-3.5 h-3.5 shrink-0 opacity-70`).
- Preserve existing button classes (`h-9 px-4 py-2` stays); wrap children in `inline-flex items-center justify-center gap-2`.
- Hotkey/secondary note: expose via tooltip — `<TooltipContent><span>Save Changes</span> <kbd className="ml-1.5 px-1 py-0.5 text-[10px] bg-gray-800 rounded border border-gray-700 font-mono">⌘S</kbd></TooltipContent>`

## Data & status indicators (Sub-Prompt B)
- Ambiguous metric headers ("Net Burn", "Churn Rate", "Weighted Score"): append `Info` or `HelpCircle` (`w-3.5 h-3.5 shrink-0 text-gray-400 hover:text-gray-600 transition-colors ml-1 cursor-help`); wrap with a calc-explainer tooltip `<TooltipContent className="max-w-xs text-xs">[Definition]</TooltipContent>`.
- Status badges: `Active`/`Healthy` → `CheckCircle2` (`text-emerald-500`); `Pending`/`In Review` → `Clock` (`text-amber-500`); `Critical`/`Failed` → `AlertTriangle` (`text-rose-500`); each `w-3.5 h-3.5 shrink-0 mr-1.5`.
- Keep the badge `inline-flex items-center` with zero line-height distortion.

## Copy-to-clipboard & quick actions (Sub-Prompt C)
- Inject the state hook if absent: `const [copied, setCopied] = useState(false);`
- Dual-state glyph: `{copied ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 animate-in zoom-in-50" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 shrink-0 text-gray-500 hover:text-gray-700" aria-hidden="true" />}`
- Dynamic tooltip: `<TooltipContent side="top">{copied ? "Copied to clipboard!" : "Copy identifier"}</TooltipContent>`
- Hit-target safety: clickable target ≥ 32×32px (`p-1.5 rounded hover:bg-gray-100 transition-colors`) while the visual SVG stays `14×14` (`w-3.5 h-3.5`).

## Accessibility (a11y) rules
- Decorative icons accompanying text: `aria-hidden="true"` on the SVG.
- Icon-only interactive controls: an unambiguous `aria-label="[Action]"`; tooltip text matches or complements the label; link helper text via `aria-describedby`.
- Tooltips follow WAI-ARIA APG: keyboard-focus trigger (`focus-visible`), dismissal on Escape / pointer leave, non-interactive content, and they do not steal pointer context.

## Deployment checklist (Phase 5)
- Console & hydration: zero React hydration-mismatch warnings (no client-only timestamps or unmounted portals during SSR).
- Stacking & overflow: scroll tables/modals — tooltips float over sticky headers without layout jumping or scrollbar popping.
- Keyboard navigation: Tab / Shift+Tab — tooltips open on `focus-visible` and close on Escape.
- Mobile / touch: tap-to-inspect is graceful, with no sticky, non-dismissible overlays over critical buttons.
