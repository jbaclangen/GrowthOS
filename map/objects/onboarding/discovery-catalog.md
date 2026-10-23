---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: web/src/lib/onboarding/catalog.ts
---

# Pain-point catalog (`catalog.ts`)

The versioned, typed list of pain-point categories, pain points and the solutions Braventa maps them to; stored responses refer to its ids, never to its text.

## Why this shape

Ids must stay stable because `onboarding_responses.pain_point_id` points at them; an entry is retired with a `deprecated` status, never deleted, and `CATALOG_VERSION` is bumped when entries change (`web/src/lib/onboarding/catalog.ts:4-6`). Solution availability must match what the product does today so no planned feature reads as live (`:7-8`). The source is the onboarding spec's §3 and §6 (`:2`; `docs/product/Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md:39,282`).

## Shape

- `CATALOG_VERSION = 1` — `web/src/lib/onboarding/catalog.ts:10`; `Availability` `available`/`planned`/`manual` — `:12`; `SOLUTIONS` with label, availability, description — `:14` onward; `CATEGORIES` `:69`; `PAIN_POINTS` `:100`; `getPainPoint` `:157`.
- Stored on each session as `catalog_version` — `supabase/migrations/20261010155911_onboarding_discovery.sql:14`, set from the constant at start — `web/src/lib/onboarding/start.ts:83`. Response rows carry the ids — `supabase/migrations/20261010155911_onboarding_discovery.sql:2,35`.
- Used by the question bank (`web/src/lib/onboarding/followups.ts:2`) and follow-up selection (`web/src/lib/onboarding/next-questions.ts:88`), and by the connect step's tool suggestions from confirmed pain points (`web/src/app/onboarding/[sessionId]/connect/page.tsx:79-86`).
- Size as documented: 10 categories, 43 pain points — `docs/product/MVP_SCOPE.md:46`.

Citations: `web/src/lib/onboarding/catalog.ts:1-14,69,100,157`; `supabase/migrations/20261010155911_onboarding_discovery.sql:2,14,35`; `web/src/lib/onboarding/start.ts:83`

## Connected to

- **owns:** nothing
- **owned-by:** none (code, not a table)
- **joins:** [onboarding-response](onboarding-response.md) (`pain_point_id`); [onboarding-session](onboarding-session.md) (`catalog_version`); [onboarding-follow-up](onboarding-follow-up.md) (questions keyed by pain point)
- **looks-like-but-is-not:** [module-registry](../modules/module-registry.md) — modules are capability areas with tiers; catalog solutions are what the plan can point an owner at

## If you change this

- **Hits:** `CATALOG_VERSION` and every stored `onboarding_responses.pain_point_id` (ids are load-bearing); the discovery form, review page, classify prompt, question bank, connect-step suggestions, the diagnosis prompt's pain-point labels; `docs/product/MVP_SCOPE.md:46`.
- **Does not hit:** [module-registry](../modules/module-registry.md) — a solution's availability is not a module's `live` flag.

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]` discovery form and `/review` | reads |
| `classifyStatement` prompt (`web/src/lib/onboarding/classify.ts`) | reads |
| `addNextRound` (`web/src/lib/onboarding/next-questions.ts:88`) | reads |
| Connect step suggestions (`web/src/app/onboarding/[sessionId]/connect/page.tsx:79-86`) | reads |
| MCP `braventa_get_discovery_questions` | reads |

## See

- Source: `web/src/lib/onboarding/catalog.ts`
- As built: `docs/product/Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md`
