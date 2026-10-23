---
type: object
cluster: config
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: site/src/app/sitemap.ts
---

# Site pages (`site/src/app`)

The public braventa.io pages, the doc each page says it must match, and the two things that cross into `web/`.

## Why this shape

Every claim on the marketing site has to stay true of the code, so each page comment names the doc or module it
mirrors, and the pricing page imports the tier list the app enforces instead of copying it
(`site/src/app/pricing/page.tsx:5-6`); Turbopack and file tracing therefore start at the repository root
(`site/next.config.ts:24-28`). The whole site stays hidden from crawlers until `SITE_INDEXABLE=true`
(`site/src/lib/indexing.ts:1-2`, `site/src/app/robots.ts:5-8`).

## Shape

- Sitemap `PATHS`: `site/src/app/sitemap.ts:4-19`; `SITE_URL` `site/src/lib/site.ts:4`. Scripts (dev on port 3001,
  build, start, lint only): `site/package.json:6-11`.

| Path | Must match | Citation |
|---|---|---|
| `/` | `docs/marketing/WEBSITE_MESSAGING.md` §3, D-005 tagline, D-035 brief | `site/src/app/page.tsx:6-9` |
| `/about` | company story, no names (founder 2026-10-11) | `site/src/app/about/page.tsx:10-11` |
| `/contact` | form token from `site/src/lib/spam.ts`; action inserts `contact_requests` with the publishable key, then posts to HubSpot | `site/src/app/contact/page.tsx:5-6`; `site/src/app/contact/actions.ts:11-14,47-54`; `site/src/lib/hubspot.ts:9-10,22-23,49-53` |
| `/how-it-works` | onboarding steps + `STEPS` in `web/src/lib/pipeline/website-intel.ts`; `computeGrowthScore` + `docs/architecture/FEATURE_MODULES.md` §9; `docs/product/BUSINESS_METHODOLOGY.md` | `site/src/app/how-it-works/page.tsx:10-11,39-42,63-64` |
| `/legal/cookies` | `docs/marketing/SITEMAP.md` §4 (no trackers, no banner) | `site/src/app/legal/cookies/page.tsx:6-7` |
| `/legal/privacy` | `docs/architecture/SECURITY_AND_PRIVACY.md`; lawyer pending (Q-032) | `site/src/app/legal/privacy/page.tsx:10` |
| `/legal/subprocessors` | `docs/architecture/INTEGRATIONS.md`; update before adding a provider | `site/src/app/legal/subprocessors/page.tsx:10` |
| `/legal/terms` | placeholder (`DraftNotice`) | `site/src/app/legal/terms/page.tsx:3,5` |
| `/pricing` | `web/src/lib/plans/tiers.ts` (D-030) | `site/src/app/pricing/page.tsx:5-6` |
| `/product` | `docs/product/MVP_SCOPE.md` + `tiers.ts`; module names D-010 | `site/src/app/product/page.tsx:10-11` |
| `/service-businesses` | no doc named in the file | `site/src/app/service-businesses/page.tsx:4-8` |
| `/trust` | `SECURITY_AND_PRIVACY.md`; no certification claims (WEBSITE_MESSAGING §10) | `site/src/app/trust/page.tsx:11` |
| `/trust/ai` | `web/src/lib/ai/router.ts` + `docs/architecture/AI_ROUTING_AND_COSTS.md` (D-024) | `site/src/app/trust/ai/page.tsx:10` |

Citations: `site/src/app/sitemap.ts:4-19`, `site/src/app/robots.ts:5-8`, `site/next.config.ts:24-28`

## Connected to

- **owns:** nothing in the database; `/contact` writes [contact-request](../integrations/contact-request.md)
- **owned-by:** —
- **joins:** [plan-tier](../tenancy/plan-tier.md) (`tiers.ts` import), [design-tokens](design-tokens.md) and [generators](generators.md) (shared `tokens.css`, `logo-geometry.ts`, icons: `CLAUDE.md:66-68`), [env-config](env-config.md) (`SITE_INDEXABLE`, `CONTACT_HASH_SALT`, `HUBSPOT_*`), [deploy-targets](deploy-targets.md) (`braventa-site`, HubSpot)
- **looks-like-but-is-not:** [app-routes](app-routes.md) (app.braventa.io; its `robots.ts` disallows everything, the site's flips on `SITE_INDEXABLE`)

## If you change this

- **Hits:** a new page → `PATHS` in `site/src/app/sitemap.ts:5-19` and the health check's path list `web/scripts/health-check.mts:29`; copy follows the live-vs-coming-soon rule (`CLAUDE.md:68`); a price or tier change is made in `web/src/lib/plans/tiers.ts`, never on the page; a new vendor → `/legal/subprocessors`; the contact form's spam gate and HubSpot are described in `docs/marketing/CONTACT_PIPELINE.md`.
- **Does not hit:** app routes, RLS, the schema (only anonymous inserts into `contact_requests`).

## Surfaces

| Surface | Role |
|---|---|
| Visitors, crawlers | read; crawlers blocked until launch |
| `site/src/app/contact/actions.ts` | writes `contact_requests`, posts to HubSpot |
| `web/scripts/health-check.mts:29` | reads the listed paths |
| Vercel `braventa-site` | serves ([deploy-targets](deploy-targets.md)) |

## See

- Source: `site/src/app/`
- As built: `docs/marketing/SITEMAP.md`
