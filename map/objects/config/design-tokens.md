---
type: object
cluster: config
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: design-system/tokens.json
---

# Design tokens (`design-system/tokens.json`)

The single source of every colour, type, spacing, radius, shadow and motion value, compiled into one `tokens.css` for
the app and one for the site.

## Why this shape

D-009 makes `tokens.json` the only place values are defined and forbids hand-editing the generated CSS
(`docs/decisions/DECISION_LOG.md:119-123`). The compiler checks WCAG contrast for every text/background role pair in
both light and dark mode and refuses to write when one drops below the minimum
(`web/scripts/build-tokens.mjs:3,41-75`), so an accessibility regression can't ship as a colour tweak. Both apps
import the same output (`web/src/app/globals.css:2-3`, `site/src/app/globals.css:2-3`), so they can't drift.

## Shape

- Format: W3C DTCG (`$value`, `$type`, `$description`, `{path}` references): `design-system/tokens.json:2`.
- Brand colours `color.brand.*` `:4-27`; `violet` is logo-only, not a UI colour (`:23-26`, D-027).
- Fonts `font.*` `:377-385`: Quicksand for headings and the wordmark, Comfortaa for everything else (D-015,
  `docs/decisions/DECISION_LOG.md:149-153`); emitted as `--font-display` / `--font-sans`
  (`web/src/styles/tokens.css:59-60`).
- Logo D-027 (`docs/decisions/DECISION_LOG.md:263-268`): rendered from generated geometry
  (`web/src/components/brand/logo.tsx:1`, `web/src/components/brand/logo-geometry.ts:1`), never typeset
  (`CLAUDE.md:50`).
- Compiler: reads `:12`, writes both outputs `:13,145`, contrast pairs and minimums `:41-60`, check mode `:132-143`,
  `@theme` emit `:86-89`.
- Rules for components: semantic roles and shared primitives only, no HEX, no `dark:` overrides, change values only
  in `tokens.json` then `npm run tokens` (`CLAUDE.md:47-49`). Pipeline doc: `design-system/DESIGN_TOKENS.md:7-19`.

Citations: `design-system/tokens.json:2,4-27,377-385`, `web/scripts/build-tokens.mjs:12-13,41-75,132-145`

## Connected to

- **owns:** `web/src/styles/tokens.css`, `site/src/styles/tokens.css` (generated)
- **owned-by:** —
- **joins:** [generators](generators.md) (`tokens`, `tokens:check`, `build-brand-assets.mjs`), [site-pages](site-pages.md) and [app-routes](app-routes.md) (every UI consumes the roles)
- **looks-like-but-is-not:** [brand-profile](../onboarding/brand-profile.md) (a customer's brand, stored per organization; this card is Braventa's own); `docs/brand/VISUAL_IDENTITY.md` (the rationale, not the values)

## If you change this

- **Hits:** `npm run tokens` in `web/` and commit both `tokens.css`; `npm run tokens:check` in verify (`CLAUDE.md:59`); a `color.brand.*` change → rerun `design-system/scripts/build-brand-assets.mjs` (it reads the colours, `:30-32`) and commit `web/public/brand/**`, the icon files and both `logo-geometry.ts`; a contrast failure blocks the compile until the value is fixed; a font or logo change is a founder decision (D-015, D-027) and `docs/brand/VISUAL_IDENTITY.md`.
- **Does not hit:** the database, `docs/help/APP_GUIDE.md`, env.

## Surfaces

| Surface | Role |
|---|---|
| `web/scripts/build-tokens.mjs` | reads, compiles, gates |
| `design-system/scripts/build-brand-assets.mjs` | reads brand colours |
| `web/src/app/globals.css`, `site/src/app/globals.css` | import the output |
| Founder | approves brand changes (D-005, D-015, D-027) |
| [build-tokens-and-brand-assets](../../processes/build-tokens-and-brand-assets.md) | the movement |

## See

- Source: `design-system/tokens.json`
- As built: `design-system/DESIGN_TOKENS.md`
