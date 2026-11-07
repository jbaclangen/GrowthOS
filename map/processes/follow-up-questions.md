---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
consumes: ["[[onboarding-session]]", "[[onboarding-response]]", "[[business-profile]]", "[[connect-step]]", "[[ai-worker]]", "[[member-role]]"]
produces: ["[[onboarding-follow-up]]", "[[onboarding-session]]", "[[ai-job]]", "[[ai-usage]]"]
---

# Follow-up questions and plan start (`continueAfterConnect` → `startPlanIfReady`)

Asks the owner up to four adaptive questions after "Connect your tools", then closes the session and starts the plan job once the evidence is in.

## Input → Movement → Output

A `following_up` session arrives from the connect step's Continue. `addNextRound` has the extractor worker pick a round from the question bank (fixed order on failure); the owner answers or skips on `/questions`; when a round adds nothing, `completeSession` sets status `completed` and calls `startPlanAfterResponse`. `startPlanIfReady` queues one `website_plan` job only when the session is finished and the evidence job succeeded, whichever side finishes second.

## Why this shape

The plan needs both the owner's answers and the crawl, and they finish in either order; without the conditional claim on `plan_job_id` the two callers could queue two plan jobs. The connect step has no status of its own, so `pendingCount` decides between connect and questions; a plain redirect would generate a second round on the back button. Generating in `after()` keeps the extractor call (up to 2 × 120 s) out of the request that already spent time.

## Steps

1. Connect page's form posts `continueAfterConnect` — `web/src/app/onboarding/[sessionId]/connect/page.tsx:127`; `maxDuration = 300` — `:25-27`; MCP skips this step — `:22`.
2. `continueAfterConnect`: status must be `following_up`; pending questions redirect to `/questions`; else `continueFollowUps` — `web/src/app/onboarding/[sessionId]/actions.ts:84-96`, redirect helper `:30-34`. Every action here needs `profile.edit`, checked in `loadSession` — `:18-23`; refusals `:88`, `:102`, `:122`.
3. `continueFollowUps` calls `addNextRound`, logging failures; zero questions → `completeSession` — `web/src/lib/onboarding/service.ts:158-168`.
4. `addNextRound`: round size from `nextRoundSize` — `web/src/lib/onboarding/next-questions.ts:68-70`, sizes at `web/src/lib/onboarding/followups.ts:133`, `:173-176`; extractor worker chooses, `fallbackSelection` on failure (first round only) — `web/src/lib/onboarding/next-questions.ts:98-112`; insert `onboarding_follow_ups` with `round` — `:115-126`; `round` check 1–3 at `supabase/migrations/20261010163029_onboarding_follow_ups.sql:15`.
5. Questions page redirects unless `following_up`, and to connect when nothing is pending — `web/src/app/onboarding/[sessionId]/questions/page.tsx:37`, `:53-54`; form binds `submitFollowUps` / `skipFollowUps` — `web/src/app/onboarding/[sessionId]/questions/follow-up-form.tsx:11-12`.
6. `submitFollowUps` → `saveFollowUps` → `continueFollowUps` — `web/src/app/onboarding/[sessionId]/actions.ts:98-115`; `web/src/lib/onboarding/service.ts:179-189`.
7. `skipFollowUps` → `skipRemainingFollowUps` (pending → `skipped`) → `completeSession` — `web/src/app/onboarding/[sessionId]/actions.ts:118-126`; `web/src/lib/onboarding/service.ts:192-199`.
8. `completeSession` sets `completed` and `startPlanAfterResponse` runs `startPlanIfReady` + `handOff` in `after()` — `web/src/lib/onboarding/service.ts:44-50`, `:33-42`.
9. `startPlanIfReady` guards: no `plan_job_id`, `evidence_job_id` set — `web/src/lib/onboarding/orchestrate.ts:18`; status `completed`/`skipped` — `:19`; evidence job `succeeded` — `:21-27`.
10. Insert `website_plan` job at `initialState` — `web/src/lib/onboarding/orchestrate.ts:29-47`; conditional claim `.is('plan_job_id', null)`, duplicate job deleted — `:50-59`.
11. The other caller: the evidence job's final step — `web/src/lib/pipeline/website-intel.ts:945-951`.

## Human gate

The owner answers or skips each round on `/questions`; any member whose role holds `profile.edit` may (`web/src/lib/team/roles.ts:90`, [member-role](../objects/tenancy/member-role.md)). Skipping is allowed; the plan is built from what they already told us.

## If you change this

- **Hits:** MCP `braventa_confirm_priorities` / `braventa_answer_follow_up_questions` (`web/src/lib/mcp/tools.ts:311`, `:379`; both carry `profile.edit` — `:287`, `:340`), the evidence job's final branch, `loadDiscovery` (reads `answered` follow-ups), [job-step-machine](job-step-machine.md) (plan job starts here).
- **Does not hit:** [discovery-and-review](discovery-and-review.md) (`saveReview` prunes follow-ups but does not generate them); the `website_intel` re-run (never touches sessions).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]/connect` | Continue generates the first round |
| `/onboarding/[sessionId]/questions` | Answer / skip rounds |
| `lib/onboarding/orchestrate.ts` | Single plan job per session |
| `extractor` worker | Picks questions from the bank |

## See

- Objects: [onboarding-session](../objects/onboarding/onboarding-session.md), [onboarding-follow-up](../objects/onboarding/onboarding-follow-up.md), [onboarding-response](../objects/onboarding/onboarding-response.md), [connect-step](../objects/onboarding/connect-step.md), [ai-job](../objects/pipeline/ai-job.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Processes: [connect-search-console](connect-search-console.md), [crawl-and-profile](crawl-and-profile.md), [score-and-diagnose](score-and-diagnose.md)
- Source: `web/src/app/onboarding/[sessionId]/actions.ts`, `web/src/lib/onboarding/next-questions.ts`, `web/src/lib/onboarding/orchestrate.ts`
