---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[design-tokens]]"]
produces: ["[[design-tokens]]", "[[generators]]"]
---

# build-tokens-and-brand-assets

Turn a change in `design-system/tokens.json` into the two committed `tokens.css` files and, when brand colours or the
mark move, into the logo, icon and social files, with a contrast gate in the way.

## Input → Movement → Output

The input is an edit to `design-system/tokens.json`, the only token source (`design-system/tokens.json:2`; D-009
`docs/decisions/DECISION_LOG.md:119-123`). `web/scripts/build-tokens.mjs` resolves references, checks every
text/background role pair in light and dark mode and writes `web/src/styles/tokens.css` and
`site/src/styles/tokens.css` (`:12-13,41-75,145`); `design-system/scripts/build-brand-assets.mjs` reads the brand
colours and font outlines and writes `web/public/brand/**`, the icon files of both apps and both `logo-geometry.ts`
(`:1-4,30-32`). The outputs are committed and carry a "do not edit" first line.

## Why this shape

A value typed into a component or a hand-edited `tokens.css` would let the app and the site drift and would skip the
contrast gate, so a colour change could fail WCAG AA without anyone noticing (`web/scripts/build-tokens.mjs:3,72-75`).
The brand files embed the colours, so a brand colour change without a rerun leaves the logo on the old palette.

## Steps

1. Change `design-system/tokens.json` only (`CLAUDE.md:47-49`). Fonts and the logo are founder decisions (see gate).
2. In `web/`, run `npm run tokens` (`web/package.json:10`). The script reads the source (`web/scripts/build-tokens.mjs:12`),
   fails with the offending pair when a ratio is below `PAIRS` minimums (`:41-60,62-75`), else writes both outputs
   (`:13,145`), each headed "GENERATED … do not edit" (`:83-84`; `web/src/styles/tokens.css:1-2`).
3. Run `npm run tokens:check` (`web/package.json:11`; `web/scripts/build-tokens.mjs:132-143`): exit 1 when either
   committed CSS lags. It is part of verify (`CLAUDE.md:59`).
4. If `color.brand.*` (`design-system/tokens.json:4-27`) or the mark changed: from the repo root run
   `BRAND_TOOLS_DIR=<tools dir> node design-system/scripts/build-brand-assets.mjs` (`:6-9`); the tools are not app
   dependencies on purpose (`:6`). Outputs: `:3-4`; the geometry file is marked generated
   (`web/src/components/brand/logo-geometry.ts:1`, `site/src/components/brand/logo-geometry.ts:1`).
5. Commit `tokens.json`, both `tokens.css`, and the brand outputs together. Never edit `web/public/brand/**` by hand
   (`CLAUDE.md:52`).

## Human gate

Founder, for anything that changes the brand rather than a value: typography (D-015,
`docs/decisions/DECISION_LOG.md:149-151`), the logo (D-027, `:263-264`), core messaging and positioning (D-005,
`:77-79`; `CLAUDE.md:55`). A token value that keeps the brand decisions needs no gate beyond the contrast check.

## If you change this

- **Hits:** [design-tokens](../objects/config/design-tokens.md), [generators](../objects/config/generators.md), every UI in [app-routes](../objects/config/app-routes.md) and [site-pages](../objects/config/site-pages.md) (both import the output: `web/src/app/globals.css:2-3`, `site/src/app/globals.css:2-3`), `docs/brand/VISUAL_IDENTITY.md` and `design-system/DESIGN_TOKENS.md` when the rationale moves.
- **Does not hit:** the database, env, the help guide.

## Surfaces

| Surface | Role |
|---|---|
| Founder | approves brand changes |
| Developer in `web/` (tokens) and repo root (brand assets) | runs the generators, commits outputs |
| `web/scripts/build-tokens.mjs` | compiles, gates contrast, checks |
| `design-system/scripts/build-brand-assets.mjs` | renders brand files |

## See

- Objects: [[design-tokens]], [[generators]]
- Source: `web/scripts/build-tokens.mjs`, `design-system/scripts/build-brand-assets.mjs`
