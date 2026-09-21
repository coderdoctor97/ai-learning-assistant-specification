# Brand assets

Serves the header/sidebar lockup, the PWA icons and the social card. The `.svg`
files are the sources; the `.png` files are derived from them, so edit an SVG and
re-export rather than painting over a raster.

| File | Used by | Notes |
| --- | --- | --- |
| `logo-light.svg/.png` | `.brand-logo` in the site nav, sidebar and footer | for `light` + `editorial` themes |
| `logo-dark.svg/.png` | same, swapped by `[data-theme="dark"] .brand-logo-dark` | for the dark theme |
| `icon.svg`, `icon-192.png`, `icon-512.png` | `/manifest.webmanifest` | `purpose: "maskable"` too, so the tile is full-bleed and the mark stays inside the 80 % safe zone |
| `../og.png` | `metadata.openGraph.images` | 1200×630 share card |
| `../favicon.ico` | browser default request | 48/32/16 px, from `icon-512.png` |

## The wordmark

One lockup, two lines, no separate icon: `Learning` in the text token,
`Studio` in the accent token — the same two-tone treatment the `.brand em` rule
gives the text brand. Typeface is the serif brand stack, weight 600.

```
[ Learning ]   ← var(--text)
[ Studio   ]   ← var(--accent)
```

## Geometry

The SVG canvas is **384 × 128 (exactly 3:1)** because `page.tsx` and
`Sidebar.tsx` render `<img width={384} height={128}>`; the UA derives
`aspect-ratio` from those attributes, and the stylesheet sizes the lockup with
`height` + `width: auto`. A different canvas ratio would make the browser
stretch the artwork.

Within that box the ink block is measured from real glyph metrics and scaled to
fill the available height (12 px top/bottom padding), centred on both axes.

## Re-exporting the PNGs

Colours track `src/app/globals.css`; update them there and re-export:

| | light | dark |
| --- | --- | --- |
| ink | `#241d18` | `#eaeaee` |
| accent | `#8f4f2e` | `#e2a583` |

Any SVG rasteriser works. At 3× (the shipped density) with resvg:

```bash
npx @resvg/resvg-js-cli logo-light.png 1152 logo-light.svg   # width in px
convert icon-512.png -define icon:auto-resize=48,32,16 ../favicon.ico
```

Or open the SVGs in a vector editor and export at 1152 × 384 (logos) and
512 × 512 (icon). Keep `width: auto` on `.brand-logo` — the display size lives
in CSS, not in the file.

> The repo's blanket `*.png` ignore rule is scoped back by `!public/**/*.png`
> in `.gitignore`, so these files are versioned. Brand art belongs in the repo;
> stray screenshots and Playwright artifacts do not.
