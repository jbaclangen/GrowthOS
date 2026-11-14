---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: web/src/lib/onboarding/catalog.ts
---

# Pain-point catalog (`catalog.ts`)

The versioned, typed list of pain-point categories, pain points and the solutions Braventa maps them to; stored responses refer to its ids, never to its text.

## Why this shape

Ids must stay stable because `onboarding_responses.pain_point_id` points at them; an entry is retired with a `deprecated` status, never deleted, and `CATALOG_VERSION` is bumped when entries change (`web/src/lib/onboarding/catalog.ts:4-6`). Solution availability must match what the product does today so no planned feature reads as live (`:7-8`). The source is the onboarding spec's §3 and §6 (`:2`; `docs/product/Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md:39,282`).

## Shape

- `CATALOG_VERSION = 2` — `web/src/lib/onboarding/catalog.ts:10`; `Availability` `available`/`planned`/`manual` — `:12`; `SOLUTIONS` with label, availability, description — `:14-69`; `CATEGORIES` `:73`; `PAIN_POINTS` `:104`; `getPainPoint` `:161`.
- Solutions: `ai_assistant` is "AI assistant (Ask Braventa)", `available` (Ask Braventa, D-043, and the AI assistant connection, D-036) — `web/src/lib/onboarding/catalog.ts:47-53`; `analytics` stays "Performance reporting", `planned`: reports over time aren't built, and reading Search Console and GA4 into the diagnosis would need its own id — `web/src/lib/onboarding/catalog.ts:40-46`. The test pins both — `web/src/lib/onboarding/discovery.test.ts:30-38`.
- Stored on each session as `catalog_version` — `supabase/migrations/20261010155911_onboarding_discovery.sql:14`, set from the constant at start — `web/src/lib/onboarding/start.ts:83`. Response rows carry the ids — `supabase/migrations/20261010155911_onboarding_discovery.sql:2,35`.
- Used by the question bank (`web/src/lib/onboarding/followups.ts:2`) and follow-up selection (`web/src/lib/onboarding/next-questions.ts:88`), and by the connect step's tool suggestions from confirmed pain points (`web/src/app/onboarding/[sessionId]/connect/page.tsx:86-93`, through `suggestTools`, which matches each tool's catalog pain-point ids against the confirmed ones — `web/src/lib/integrations/tool-catalog.ts:1,128-148`).
- Size as documented: 10 categories, 43 pain points — `docs/product/MVP_SCOPE.md:46`.

Citations: `web/src/lib/onboarding/catalog.ts:1-14,40-53,73,104,161`; `web/src/lib/onboarding/discovery.test.ts:30-38`; `supabase/migrations/20261010155911_onboarding_discovery.sql:2,14,35`; `web/src/lib/onboarding/start.ts:83`; `web/src/lib/onboarding/followups.ts:2`; `web/src/lib/onboarding/next-questions.ts:88`; `web/src/lib/integrations/tool-catalog.ts:1,128-148`; `docs/product/MVP_SCOPE.md:46`

## Connected to

- **owns:** nothing
- **owned-by:** none (code, not a table)
- **joins:** [onboarding-response](onboarding-response.md) (`pain_point_id`); [onboarding-session](onboarding-session.md) (`catalog_version`); [onboarding-follow-up](onboarding-follow-up.md) (questions keyed by pain point)
- **looks-like-but-is-not:** [module-registry](../modules/module-registry.md) — modules are capability areas with tiers; catalog solutions are what the plan can point an owner at

## If you change this

- **Hits:** `CATALOG_VERSION` and every stored `onboarding_responses.pain_point_id` (ids are load-bearing); the discovery form, review page, classify prompt, question bank, connect-step suggestions, the diagnosis prompt's pain-point labels; a solution's `availability` reaches the diagnosis prompts (`web/src/lib/pipeline/prompts.ts:221,267`) and the plan item's split into what Braventa can do now and what it can't yet (`capability`, `web/src/lib/plan/priority.ts:174-178`); `discovery.test.ts`; `docs/product/MVP_SCOPE.md:46`.
- **Does not hit:** [module-registry](../modules/module-registry.md) — a solution's availability is not a module's `live` flag.

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]` discovery form and `/review` | reads |
| `classifyStatement` prompt (`web/src/lib/onboarding/classify.ts`) | reads |
| `addNextRound` (`web/src/lib/onboarding/next-questions.ts:88`) | reads |
| Connect step suggestions (`web/src/app/onboarding/[sessionId]/connect/page.tsx:86-93`) | reads |
| MCP `braventa_get_discovery_questions` | reads |

## See

- Source: `web/src/lib/onboarding/catalog.ts`
- As built: `docs/product/Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md`
