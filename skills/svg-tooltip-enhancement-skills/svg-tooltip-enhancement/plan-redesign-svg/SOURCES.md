# Curated SVG & tooltip intelligence matrix — the 18 sources

The plan (and, during implementation, the transforms) draws **strictly** from this matrix. Cite the source(s) each phase or transformation comes from. A need that falls outside these 18 is flagged as *outside the matrix* and sourced from the audit + the agent's own knowledge.

| # | Source | Category | Link | Zero-regression utility |
|---|--------|----------|------|--------------------------|
| 1 | Lucide React | Icon system (React components) | https://lucide.dev/guide/react/ | Clean, tree-shakable inline SVGs on a 24×24 viewBox; accepts `className`/`size`/`strokeWidth`; inherits color via `stroke="currentColor"` so it never shifts the palette |
| 2 | Radix UI Tooltip | Headless tooltip primitive | https://www.radix-ui.com/primitives | Portals content to `document.body`, bypassing parent `overflow-hidden`, modals, and sticky-header clipping; full ARIA out of the box |
| 3 | Floating UI React | Headless tooltip / positioning | https://floating-ui.com/docs/react | Surgical anchor-to-floating coordinates with collision detection, flip, and shift; zero DOM displacement of the reference trigger |
| 4 | Heroicons React | Icon system (Tailwind native) | https://github.com/tailwindlabs/heroicons | Tailwind-authored; pixel-aligned 16/20/24; calibrates with Tailwind type and line-height scales, no sub-pixel jitter |
| 5 | Iconify for React | Universal icon framework | https://github.com/iconify/iconify | One loader for 200,000+ glyphs (Material, Phosphor, Carbon, Feather), on-demand; no multi-library bundle overhead |
| 6 | Phosphor Icons React | Icon system (multi-weight) | https://github.com/phosphor-icons/react | 6 stroke weights (thin, light, regular, bold, fill, duotone) via `IconContext.Provider`; uniform global micro-adjustments |
| 7 | React Icons | Universal icon bundle | https://react-icons.github.io/react-icons/ | Consolidated open-source sets as standard ES6 imports; drop-in replacement for legacy font-icon tags |
| 8 | Tabler Icons React | Icon system (data & dashboard) | https://github.com/tabler/tabler-icons | 5,200+ stroke icons on a 24×24 2px grid; strong for metrics, tickers, status pills, developer tooling |
| 9 | W3C WAI-ARIA APG Tooltip Pattern | Accessibility standard | https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/ | The mandatory contract: non-interactive content, `aria-describedby` id linking, Escape dismissal, focus-triggered visibility without stealing pointer context |
| 10 | SVGR (Webpack / Next.js) | SVG compiler / asset pipeline | https://www.npmjs.com/package/@svgr/webpack | Compiles `.svg` assets into React components at build; strips static dimensions so `w-4 h-4` sizing classes work on import |
| 11 | SVGO | SVG optimizer & cleaner | https://github.com/svg/svgo | Minifies paths, removes redundant metadata, strips fixed inline colors, standardizes `viewBox` for zero-offset rendering |
| 12 | SVGOMG | SVG GUI optimization | https://jakearchibald.github.io/svgomg/ | Visual optimizer for sanitizing designer-exported (Figma/Illustrator) SVGs before inline embedding; prevents XML namespace collisions |
| 13 | tailwind-merge | CSS class conflict resolution | https://github.com/dcastil/tailwind-merge | Resolves conflicting Tailwind classes (`p-2` vs `px-3 py-1.5`, `w-4` vs `w-5`) when wrapping existing buttons with new icon padding |
| 14 | clsx | Class composition utility | https://github.com/lukeed/clsx | 239B conditional `className` builder for toggling active icon states without string-concatenation errors |
| 15 | Radix UI Slot (`asChild`) | Component composition primitive | https://github.com/radix-ui/primitives | Merges `TooltipTrigger` props, ARIA, and handlers onto the existing child without injecting a wrapper `<div>`/`<button>` that breaks flex layouts |
| 16 | Tippy.js React | Floating overlay library | https://github.com/atomiks/tippyjs-react | Popper/Floating abstraction with spring physics, delay timers, and singleton grouping; minimal-config retrofit for legacy React |
| 17 | Simple Icons | Brand & tech vector system | https://simpleicons.org/ | 3,000+ verified brand/platform/language marks on a unified 24×24 grid; for integration bars and OAuth login triggers |
| 18 | Tailwind Hover/Focus/Group/Peer | Styling spec & pseudo-variants | https://tailwindcss.com/docs/hover-focus-and-other-states | Native CSS state modifiers (`group-hover:opacity-100`, `peer-focus-visible:block`) for zero-runtime, pure-CSS micro-tooltips on unclipped nodes |
