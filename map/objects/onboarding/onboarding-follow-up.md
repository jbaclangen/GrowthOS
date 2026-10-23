---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010163029_onboarding_follow_ups.sql
---

# Follow-up question (`onboarding_follow_ups`)

One adaptive follow-up question asked about a confirmed pain point in a session, with its round and the owner's answer, skip or "doesn't apply".

## Why this shape

Questions come from a typed question bank in code; only the stable `question_key` is stored, so wording can change without touching rows (`supabase/migrations/20261010163029_onboarding_follow_ups.sql:2`, `web/src/lib/onboarding/followups.ts:4-9`). Rounds let the extractor model pick the next questions from earlier answers; the owner is never blocked by a model failure (`web/src/lib/onboarding/service.ts:156-168`).

## Shape

- Columns: `pain_point_id`, `question_key`, `round` 1–3, `status` `pending`/`answered`/`skipped`/`not_applicable`, `answer` ≤ 500 (present exactly when answered), `answered_at`; unique (session, pain point, key); composite FK to the session — `supabase/migrations/20261010163029_onboarding_follow_ups.sql:8-27`. RLS "members all" `:31-33`.
- The code asks at most two rounds of two (`ROUND_SIZES`, `MAX_FOLLOW_UPS`, `nextRoundSize`) — `web/src/lib/onboarding/followups.ts:132-134,173-176` — though the column allows round 3.
- Writers: `addNextRound` chooses with the `extractor` worker (default order on failure) and inserts the round — `web/src/lib/onboarding/next-questions.ts:54-125`; `saveFollowUps` `web/src/lib/onboarding/service.ts:179-189`; `skipRemainingFollowUps` `:192-199`; pruned when discovery is redone `:97` or priorities change `:145-150`.
- Readers: `pendingFollowUps` `web/src/lib/onboarding/service.ts:170-177`; questions page `web/src/app/onboarding/[sessionId]/questions/page.tsx:40-44,53-54`; scoring `loadDiscovery` `web/src/lib/pipeline/website-intel.ts:395-401`; report `web/src/app/analysis/[id]/report-data.ts:149`.
- Gate (D-046): the web writes need `profile.edit` (`web/src/app/onboarding/[sessionId]/actions.ts:21,88,102,122`); MCP `braventa_confirm_priorities` and `braventa_answer_follow_up_questions` carry it (`web/src/lib/mcp/tools.ts:287,340`). Matrix: [member-role](../tenancy/member-role.md).

Citations: `supabase/migrations/20261010163029_onboarding_follow_ups.sql:2,8-33`; `web/src/lib/onboarding/followups.ts:4-9,132-134,173-176`; `web/src/lib/onboarding/next-questions.ts:54-125`; `web/src/lib/onboarding/service.ts:97,145-199`; `web/src/app/onboarding/[sessionId]/actions.ts:21,84-126`; `web/src/lib/mcp/tools.ts:287,311,340,376,382`; `web/src/lib/pipeline/website-intel.ts:395-401`

## Connected to

- **owns:** nothing
- **owned-by:** [onboarding-session](onboarding-session.md), [organization](../tenancy/organization.md)
- **joins:** [onboarding-response](onboarding-response.md) (asked only about confirmed priorities, `web/src/lib/onboarding/next-questions.ts:72-74`); [discovery-catalog](discovery-catalog.md) (`pain_point_id`); [connect-step](connect-step.md) (its Continue generates the round)
- **looks-like-but-is-not:** the diagnosis's "open questions" in [diagnosis](../report/diagnosis.md) — model output, not owner answers

## If you change this

- **Hits:** `followUpStep` (pending count decides connect vs questions, `web/src/lib/onboarding/steps.ts:31-37`), `continueAfterConnect`, the questions page, `loadDiscovery`, MCP `braventa_get_follow_up_questions`/`braventa_answer_follow_up_questions`, `docs/architecture/DATA_MODEL.md:93` (which says rounds 1–2).
- **Does not hit:** [onboarding-response](onboarding-response.md) rows — answers never write back to responses.

## Surfaces

| Surface | Role |
|---|---|
| Connect step Continue → `continueAfterConnect` (`web/src/app/onboarding/[sessionId]/actions.ts:84-96`) | writes (new round) |
| `/onboarding/[sessionId]/questions` → `submitFollowUps`/`skipFollowUps` (`:98-126`) | reads, writes |
| MCP `braventa_confirm_priorities` → `continueFollowUps` (`web/src/lib/mcp/tools.ts:311`) | writes (new round) |
| MCP `braventa_answer_follow_up_questions` → `saveFollowUps`, then `continueFollowUps` (`web/src/lib/mcp/tools.ts:376,382`) | writes (answers, new round) |
| Scoring step (`web/src/lib/pipeline/website-intel.ts:395-401`) | reads |
| Report answers tile (`web/src/app/analysis/[id]/report-data.ts:149`) | reads |

## See

- Source: `supabase/migrations/20261010163029_onboarding_follow_ups.sql`
- As built: `docs/product/MVP_SCOPE.md`
