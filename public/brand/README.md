# Brand assets

Nothing here is invented by the stylesheet: the files below are the artwork, and
CSS only decides how tall it displays.

## Required files

| Path | Rendered by | Shown when |
| --- | --- | --- |
| `logo-light.png` | `.brand-logo` in the site nav, sidebar and footer | `light` + `editorial` themes |
| `logo-dark.png` | same, via `.brand-logo-dark` | `[data-theme="dark"]` |
| `icon-192.png`, `icon-512.png` | `/manifest.webmanifest` (PWA install, also `purpose: maskable`) | install / splash |
| `../og.png` | `metadata.openGraph.images` | 1200×630, link previews |
| `../favicon.ico` | browser default request | 48/32/16 px |

Only `logo-light.png` and `logo-dark.png` are referenced by components, so the
header works as soon as those two exist. The rest are still 404ing and need the
mark cropped out of the logo — the square part of the lockup, kept inside the
80% safe zone so the maskable crop cannot clip it.

## Which file goes in which slot

The slot is decided by **ink brightness, not by filename**: `logo-light.png`
sits on the cream surfaces (`--bg #efe6dd`, `--surface #fbf7f2`) so it needs dark
ink; `logo-dark.png` sits on `#0c0d10`/`#14161a` so it needs light ink. Drop the
light-ink export (white "Learning") into `logo-dark.png` and the dark-ink export
into `logo-light.png`, otherwise the word reads invisible on its own theme.

## Proportions

`globals.css` sizes the lockup with `height` only (`2.5rem` in the nav, `2.75rem`
in the sidebar) and keeps `width: auto` + `aspect-ratio: auto`, so each file is
displayed at its own ratio and can never be stretched — the `width={384}
height={128}` attributes in `page.tsx`/`Sidebar.tsx` no longer constrain it, they
only hint the box before the image decodes.

Two consequences worth knowing:

- Export both themes on the **same canvas size**. The current pair differs
  (~3.5:1 vs ~4:1), so the lockup is ~19% wider in dark mode, which nudges the
  chip next to it when the theme flips.
- Any height ≥ 120 px is plenty for the nav slot, and ≥ 132 px for the sidebar.
  A 500 px-tall export is ~12× oversampled: crisp, but re-export at ~2× if the
  byte size matters.

## Versioning

`.gitignore` ignores `*.png` repo-wide (build output, Playwright artifacts). The
`!public/**/*.png` exception at the bottom of that file is what keeps brand art
committed — without it the assets silently never reach a fresh clone, which is
how `/brand/logo-light.png` ended up missing in the first place.
