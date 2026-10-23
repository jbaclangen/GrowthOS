---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261010155911_onboarding_discovery.sql
---

# What you told us (`onboarding_responses`)

An owner's discovery answers for one session: catalog pain points (picked or AI-suggested and confirmed), their own-words statement, and the top-three priorities.

## Why this shape

Pain points are stable catalog ids, never free text, so the pipeline can rank them; the owner's words are kept beside the AI's mapping and only confirmed rows count (`supabase/migrations/20261010155911_onboarding_discovery.sql:2,33-37,75`). Priorities are a unique rank per session so the plan can address 1–3 first (`:53-54`, `docs/product/MVP_SCOPE.md:46`).

## Shape

- `kind` `pain_point`/`statement`; `pain_point_id` present exactly when `kind = 'pain_point'`; `source` `owner_selected`/`ai_suggested` (statements are always owner-selected); `confirmed`; `original_text` ≤ 1000; `ai_confidence`; `customer_priority` 1–3 — `supabase/migrations/20261010155911_onboarding_discovery.sql:29-48`.
- Unique (session, pain point) and (session, priority) — `supabase/migrations/20261010155911_onboarding_discovery.sql:51-54`; composite FK to the session `:44-45`; RLS "members all" `:61-62`.
- Writers: `saveDiscovery` replaces the session's rows and follow-ups, adding AI-suggested rows from `classifyStatement` — `web/src/lib/onboarding/service.ts:61-104` (model call `web/src/lib/onboarding/classify.ts:24-34`); `saveReview` clears and sets `confirmed` and `customer_priority` — `web/src/lib/onboarding/service.ts:122-154`.
- Readers: `reviewCandidates` `web/src/lib/onboarding/service.ts:107-120`; `addNextRound` `web/src/lib/onboarding/next-questions.ts:57-60`; scoring `loadDiscovery` `web/src/lib/pipeline/website-intel.ts:389-394`; connect step `web/src/app/onboarding/[sessionId]/connect/page.tsx:54-58`; questions page `web/src/app/onboarding/[sessionId]/questions/page.tsx:45-49`; report `web/src/app/analysis/[id]/report-data.ts:143`.
- Gate (D-046): `submitDiscovery` and `submitReview` need `profile.edit` (`web/src/app/onboarding/[sessionId]/actions.ts:21,43,66`); MCP `braventa_submit_discovery` and `braventa_confirm_priorities` carry it (`web/src/lib/mcp/tools.ts:246,287`). Matrix: [member-role](../tenancy/member-role.md).

Citations: `supabase/migrations/20261010155911_onboarding_discovery.sql:29-54,61-62`; `web/src/lib/onboarding/service.ts:61-154`; `web/src/lib/onboarding/classify.ts:24-34`; `web/src/lib/pipeline/website-intel.ts:389-394`; `web/src/app/onboarding/[sessionId]/actions.ts:21,43,66`; `web/src/lib/mcp/tools.ts:246,267,287,309`

## Connected to

- **owns:** nothing
- **owned-by:** [onboarding-session](onboarding-session.md), [organization](../tenancy/organization.md)
- **joins:** [discovery-catalog](discovery-catalog.md) (`pain_point_id`); [onboarding-follow-up](onboarding-follow-up.md) (questions are asked about confirmed priorities); [diagnosis-finding](../report/diagnosis-finding.md) (`customer_provided` provenance rests on these)
- **looks-like-but-is-not:** [business-profile](business-profile.md) owner inputs (`goals`, `service_area`, `current_tools`) — guided-onboarding answers stored on the profile, not here

## If you change this

- **Hits:** `saveDiscovery`/`saveReview`, `reviewCandidates`, `addNextRound`, `loadDiscovery` and the diagnosis prompt's "what you told us", the review/connect/questions pages, the report's answers tile, MCP `braventa_submit_discovery`/`braventa_confirm_priorities`.
- **Does not hit:** [onboarding-follow-up](onboarding-follow-up.md) rows directly — they are pruned by session, not by response id (`web/src/lib/onboarding/service.ts:97,145-150`).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]` discovery form → `submitDiscovery` | writes |
| `/onboarding/[sessionId]/review` → `submitReview` | writes `confirmed`, `customer_priority` |
| MCP `braventa_submit_discovery`, `braventa_confirm_priorities` (`web/src/lib/mcp/tools.ts:267,309`) | writes |
| Scoring step (`web/src/lib/pipeline/website-intel.ts:389-394`) | reads |
| Report "What you told us" (`web/src/app/analysis/[id]/report-data.ts:143`) | reads |

## See

- Source: `supabase/migrations/20261010155911_onboarding_discovery.sql`
- As built: `docs/product/MVP_SCOPE.md`
