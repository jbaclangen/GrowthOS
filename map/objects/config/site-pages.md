---
type: object
cluster: config
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: site/src/app/sitemap.ts
---

# Site pages (`site/src/app`)

The public braventa.io pages, the doc each page says it must match, and the files it imports from `web/`.

## Why this shape

Every claim on the marketing site has to stay true of the code, so each page comment names the doc or module it
mirrors, and the pricing page imports the tier list and the business limits the app enforces instead of copying them
(`site/src/app/pricing/page.tsx:5-8`); Turbopack and file tracing therefore start at the repository root
(`site/next.config.ts:24-28`). The whole site stays hidden from crawlers until `SITE_INDEXABLE=true`
(`site/src/lib/indexing.ts:1-2`, `site/src/app/robots.ts:5-8`).

## Shape

- Sitemap `PATHS`: `site/src/app/sitemap.ts:4-27`; `SITE_URL` `site/src/lib/site.ts:4`. Scripts (dev on port 3001,
  build, start, lint only): `site/package.json:6-11`.

| Path | Must match | Citation |
|---|---|---|
| `/` | `docs/marketing/WEBSITE_MESSAGING.md` §0 and §3, D-005 tagline (`TAGLINE`), D-035 brief, D-036, D-043, D-046, D-058, D-059, D-061 | `site/src/app/page.tsx:6-10` |
| `/about` | company story, no names (founder 2026-10-11) | `site/src/app/about/page.tsx:10-11` |
| `/contact` | form token from `site/src/lib/spam.ts`; action inserts `contact_requests` with the publishable key, then posts to HubSpot | `site/src/app/contact/page.tsx:5-6`; `site/src/app/contact/actions.ts:11-14,47-54`; `site/src/lib/hubspot.ts:9-10,22-23,49-53` |
| `/how-it-works` | onboarding steps + `STEPS` in `web/src/lib/pipeline/website-intel.ts`; `computeGrowthScore` + `docs/architecture/FEATURE_MODULES.md` §9, §10; `docs/product/BUSINESS_METHODOLOGY.md` | `site/src/app/how-it-works/page.tsx:11-12,36,54-59,81-82` |
| `/legal/cookies` | `docs/marketing/SITEMAP.md` §4 (no trackers, no banner); the app's strictly necessary cookies, the current-business one included | `site/src/app/legal/cookies/page.tsx:6-7,17-19` |
| `/legal/dpa` | processor terms (D-056); Annex 2 lists only built measures | `site/src/app/legal/dpa/page.tsx:10-12` |
| `/legal/gdpr` | guide for EU and UK customers (D-056); Art. 27 representatives pending (Q-053) | `site/src/app/legal/gdpr/page.tsx:10-12` |
| `/legal/msa` | service scope must match what is live; SLA for paid plans (D-056) | `site/src/app/legal/msa/page.tsx:10-13`; what Braventa does and doesn't do `:34-96`; SLA `:111-172`; connected apps `:204-234` |
| `/legal/privacy` | `docs/architecture/SECURITY_AND_PRIVACY.md`, `docs/research/LEGAL_AND_PRIVACY_REVIEW_2026-11-08.md` §2; lawyer pending (Q-032) | `site/src/app/legal/privacy/page.tsx:10-13` |
| `/legal/refunds` | refund rules (D-056); billing not built (Q-010) | `site/src/app/legal/refunds/page.tsx:10-13` |
| `/legal/subprocessors` | `docs/architecture/INTEGRATIONS.md`; update before adding a provider | `site/src/app/legal/subprocessors/page.tsx:10` |
| `/legal/terms` | D-056; vendor caps in `docs/research/LEGAL_AND_PRIVACY_REVIEW_2026-11-08.md` §1 | `site/src/app/legal/terms/page.tsx:7-10`; disclaimer and liability (§§11-13) `:176-243` |
| `/pricing` | `web/src/lib/plans/tiers.ts` (D-030) and `web/src/lib/plans/business-limit.ts` (D-062), both imported; prices `PRICES` (D-039) and seats `SEATS` (mirrors `web/src/lib/team/seats.ts`, D-046) in `site/src/lib/site.ts:61-71` | `site/src/app/pricing/page.tsx:4-8` |
| `/product` | `docs/product/MVP_SCOPE.md` + `tiers.ts` + `web/src/lib/modules/registry.ts`; module names D-010; tools mirror `tool-catalog.ts`; seats from `SEATS` | `site/src/app/product/page.tsx:3,11-13,92` |
| `/service-businesses` | no doc named in the file | `site/src/app/service-businesses/page.tsx:4-8` |
| `/trust` | `SECURITY_AND_PRIVACY.md`; no certification claims (WEBSITE_MESSAGING §10) | `site/src/app/trust/page.tsx:11` |
| `/trust/ai` | `web/src/lib/ai/router.ts` + `docs/architecture/AI_ROUTING_AND_COSTS.md` (D-024) | `site/src/app/trust/ai/page.tsx:10` |

Citations: `site/src/app/sitemap.ts:4-27`, `site/src/app/robots.ts:5-8`, `site/next.config.ts:24-28`

## Connected to

- **owns:** nothing in the database; `/contact` writes [contact-request](../integrations/contact-request.md)
- **owned-by:** —
- **joins:** [plan-tier](../tenancy/plan-tier.md) (`tiers.ts` import), [account-trial](../tenancy/account-trial.md) (`business-limit.ts` import), [design-tokens](design-tokens.md) and [generators](generators.md) (shared `tokens.css`, `logo-geometry.ts`, icons: `CLAUDE.md:75-77`), [env-config](env-config.md) (`SITE_INDEXABLE`, `CONTACT_HASH_SALT`, `HUBSPOT_*`), [deploy-targets](deploy-targets.md) (`braventa-site`, HubSpot)
- **looks-like-but-is-not:** [app-routes](app-routes.md) (app.braventa.io; its `robots.ts` disallows everything, the site's flips on `SITE_INDEXABLE`)

## If you change this

- **Hits:** a new page → `PATHS` in `site/src/app/sitemap.ts:5-23` and the health check's path list `web/scripts/health-check.mts:29`; copy follows the live-vs-coming-soon rule (`CLAUDE.md:77`); a tier, feature or business limit change is made in `web/src/lib/plans/tiers.ts` or `web/src/lib/plans/business-limit.ts`, never on the page; a price in `PRICES` and a seat allowance in `SEATS` (`site/src/lib/site.ts:61-71`, the latter together with `web/src/lib/team/seats.ts:15-19`); a new vendor → `/legal/subprocessors`; a scored module or evidence source added, removed or reweighted → the hand-written score and source copy on `/` (`site/src/app/page.tsx:31,69,108,347`), `/product` (`site/src/app/product/page.tsx:31,62-66`), `/how-it-works` (`site/src/app/how-it-works/page.tsx:54-59,64,73`), `/pricing` FAQ (`site/src/app/pricing/page.tsx:31-34`), `/trust` (`site/src/app/trust/page.tsx:56-57`) and `/trust/ai` (`site/src/app/trust/ai/page.tsx:29-30,76-85`), which must match [growth-score](../report/growth-score.md) and the app's `BLEND` list (`web/src/lib/modules/score.ts:205-210`); `LIVE_TODAY` (`site/src/lib/site.ts:56-59`) names what Braventa doesn't do yet; the site imports neither; the contact form's spam gate and HubSpot are described in `docs/marketing/CONTACT_PIPELINE.md`.
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
