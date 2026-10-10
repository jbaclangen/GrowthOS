# Brand asset inventory

Every Braventa brand asset, where it lives, what it's for, and its status. All logo and social files are
**generated** by [`design-system/scripts/build-brand-assets.mjs`](../../design-system/scripts/build-brand-assets.mjs)
from the symbol geometry, Quicksand/Comfortaa outlines, and `tokens.json` colours — edit the script, never the
output files. Usage rules: [`VISUAL_IDENTITY.md` §2](VISUAL_IDENTITY.md#2-logo).

Status / last reviewed: 2026-10-10. **Status legend:** *Ready* = generated, checked visually, usable ·
*Draft* = usable but awaiting founder review · *Conceptual* = specified, not produced · *Needs designer* = beyond
code generation. Nothing here is trademark-cleared (Q-014).

## Logo files — `web/public/brand/` (served at `/brand/…`)

| File | Description | Status |
|---|---|---|
| `braventa-logo-horizontal.svg` | Primary lockup, Ink + Cobalt node, for light backgrounds | Draft |
| `braventa-logo-horizontal-reversed.svg` | Paper + Volt node, for dark backgrounds | Draft |
| `braventa-logo-horizontal-mono-black.svg` / `-mono-white.svg` | One-colour versions | Draft |
| `braventa-logo-stacked.svg` (+ `-reversed`, `-mono-black`, `-mono-white`) | Stacked lockup | Draft |
| `braventa-symbol.svg` (+ `-reversed`, `-mono-black`, `-mono-white`) | Waypoint symbol alone, tight bounds | Draft |
| `braventa-wordmark.svg` (+ `-reversed`, `-mono-black`, `-mono-white`) | Lowercase Quicksand Bold wordmark, outlined | Draft |
| `braventa-app-icon.svg` | Ink tile, Paper glyph, Volt node (48 grid, r = 11) | Draft |
| `png/braventa-logo-horizontal-1200.png`, `-reversed-1200.png`, `png/braventa-logo-stacked-800.png` | Raster lockups for tools that don't take SVG (Canva, slides, email clients) | Draft |
| `png/braventa-app-icon-{192,512,1024}.png` | App icon rasters (PWA, stores, Canva) | Draft |

"Draft" means: produced and visually checked, awaiting the founder's sign-off on the Waypoint symbol (D-008) and
lowercase wordmark (D-017).

## Social — `web/public/brand/social/`

| File | Size | Use | Status |
|---|---|---|---|
| `braventa-og-1200x630.svg/.png` | 1200 × 630 | Link previews (also wired as the app's Open Graph image) | Draft |
| `braventa-linkedin-cover-1584x396.svg/.png` | 1584 × 396 | LinkedIn company page cover | Draft |
| `braventa-x-header-1500x500.svg/.png` | 1500 × 500 | X / Twitter header | Draft |
| `braventa-avatar-400.png` | 400 × 400 | Profile picture (glyph inset for circular crops) | Draft |

Check the banners on each platform before publishing: profile-photo overlays sit bottom-left on LinkedIn, and
mobile crops differ.

## App metadata files — `web/src/app/` (Next.js conventions)

| File | Purpose | Status |
|---|---|---|
| `icon.svg` | Browser favicon (modern browsers) | Ready |
| `favicon.ico` | 16/32/48 px fallback favicon (replaced the Next.js default) | Ready |
| `apple-icon.png` | 180 × 180 iOS home-screen icon (full-bleed; iOS applies the mask) | Ready |
| `opengraph-image.png` + `.alt.txt` | Default social preview for every app route | Ready |

## In-app components

| File | Purpose |
|---|---|
| `web/src/components/brand/logo.tsx` | `<Logo variant="lockup" | "symbol" height={…} />` — inline, theme-aware |
| `web/src/components/brand/logo-geometry.ts` | Generated geometry for the component (do not edit) |

## Sources and tooling

| Item | Location |
|---|---|
| Symbol geometry, lockup construction, social layouts | `design-system/scripts/build-brand-assets.mjs` |
| Colours | `design-system/tokens.json` |
| Fonts | Quicksand, Comfortaa — SIL OFL, via `@fontsource-variable/*` (build) and `next/font/google` (app) |

Regenerate (tools stay out of the app's dependencies):
```bash
mkdir -p /tmp/brand-tools && cd /tmp/brand-tools && npm init -y && npm i fontkit wawoff2 sharp png-to-ico @fontsource-variable/quicksand @fontsource-variable/comfortaa
```
```bash
BRAND_TOOLS_DIR=/tmp/brand-tools node design-system/scripts/build-brand-assets.mjs
```

## Not yet produced

| Asset | Status | Note |
|---|---|---|
| Email header/footer HTML | Conceptual | Spec in `EMAIL_TEMPLATES.md`; build when an email provider is chosen (Q-010). Use the PNG lockup (email clients block SVG). |
| Canva brand kit | Needs founder | Upload the PNG lockups, palette HEX values, and Quicksand/Comfortaa (both available in Canva's font library) to Canva Brand Kit. |
| Slide template | Conceptual | Outline in `CAMPAIGN_GUIDELINES.md`. |
| Business card, letterhead, print | Conceptual | Use mono or primary lockups; CMYK values not defined yet. |
| Icon set | Conceptual | Lucide recommended (`VISUAL_IDENTITY.md` §8); not installed. |
| Marketing website | Not started | braventa.io, Hostinger (D-011). |
| Brand motion / animated logo | Conceptual | Possible: path draws toward the node, node lights up. |
| Professional refinement of the symbol | Needs designer (optional) | Optical tweaks at 16 px and kerning against the wordmark if desired. |
