---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[onboarding-session]]", "[[discovery-catalog]]", "[[ai-worker]]"]
produces: ["[[onboarding-response]]", "[[onboarding-session]]", "[[ai-usage]]"]
---

# Discovery and review (`submitDiscovery` → `submitReview`)

Moves a session from the owner's pain points and free text, through AI-suggested matches, to a confirmed top three.

## Input → Movement → Output

The owner picks catalog pain points and may describe the problem in their own words on `/onboarding/{id}`. `saveDiscovery` classifies the free text with the extractor worker, replaces the session's responses and sets status `reviewing`; on `/review` the owner keeps or drops candidates and ranks up to three, which `saveReview` writes as `confirmed` and `customer_priority`. The session leaves at status `following_up`, headed for `/connect`.

## Why this shape

Status-driven routing in `lib/onboarding/steps.ts` lets the owner leave at any step and come back (ON-6); without it each page would need its own resume logic. The AI classification is optional by design: a failed call still saves the statement, so a model outage never blocks the owner. The review step exists because AI suggestions are unconfirmed until a person keeps them.

## Steps

1. Discovery page loads the session, redirects if not open, and shows the evidence status line — `web/src/app/onboarding/[sessionId]/page.tsx:29-35`, `:56`; the line reads `ai_jobs.status` — `web/src/app/onboarding/[sessionId]/evidence-status.tsx:5-8`.
2. Form posts `submitDiscovery` — `web/src/app/onboarding/[sessionId]/discovery-form.tsx:17`; "Skip for now" posts `skipDiscovery` — `:99`.
3. `submitDiscovery` parses, loads the session, calls `saveDiscovery`, redirects to `/review` — `web/src/app/onboarding/[sessionId]/actions.ts:30-42`.
4. `saveDiscovery`: owner picks become `owner_selected` rows; the statement goes to `classifyStatement` (worker `extractor`), failures are logged, matches become `ai_suggested` rows — `web/src/lib/onboarding/service.ts:61-94`; `web/src/lib/onboarding/classify.ts:24-34`.
5. Delete the session's follow-ups and responses, insert the new rows, set status `reviewing` — `web/src/lib/onboarding/service.ts:97-103`.
6. `skipDiscovery` sets status `skipped` and calls `startPlanAfterResponse` — `web/src/lib/onboarding/service.ts:52-58`, `:33-42`; action at `web/src/app/onboarding/[sessionId]/actions.ts:44-50`.
7. Review page redirects unless open and past `discovering` — `web/src/app/onboarding/[sessionId]/review/page.tsx:34`; form posts `submitReview` — `web/src/app/onboarding/[sessionId]/review/review-form.tsx:24`, skip at `:50`.
8. `submitReview` loads candidates (`reviewCandidates`), parses, calls `saveReview`, redirects to `/connect` — `web/src/app/onboarding/[sessionId]/actions.ts:52-69`; `web/src/lib/onboarding/service.ts:107-120`.
9. `saveReview`: clear priorities, set `confirmed` and `customer_priority` per candidate, prune pending and off-priority follow-ups, set status `following_up` — `web/src/lib/onboarding/service.ts:122-154`.
10. Routing by status: `OPEN_STATUSES` and `onboardingPath` — `web/src/lib/onboarding/steps.ts:9-26`; `following_up` splits into connect vs questions by pending count — `:31-37`.

## Human gate

The owner confirms the priorities on `/review` (steps 8–9). AI suggestions stay `confirmed: false` until kept.

## If you change this

- **Hits:** MCP `braventa_submit_discovery` and `braventa_confirm_priorities` (same `saveDiscovery`/`saveReview`: `web/src/lib/mcp/tools.ts:253`, `:294`), [follow-up-questions](follow-up-questions.md) (reads `confirmed` + `customer_priority`), `loadDiscovery` in [score-and-diagnose](score-and-diagnose.md).
- **Does not hit:** the evidence job (it never reads responses); the `startPlanIfReady` guards (only status `completed`/`skipped` matter there).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]` | Pain points + statement form |
| `/onboarding/[sessionId]/review` | Keep / rank candidates |
| `lib/onboarding/service.ts` | Shared step logic (web + MCP) |
| `extractor` worker | Maps free text to catalog ids |

## See

- Objects: [onboarding-session](../objects/onboarding/onboarding-session.md), [onboarding-response](../objects/onboarding/onboarding-response.md), [discovery-catalog](../objects/onboarding/discovery-catalog.md), [ai-worker](../objects/pipeline/ai-worker.md), [ai-usage](../objects/pipeline/ai-usage.md)
- Processes: [start-analysis](start-analysis.md), [follow-up-questions](follow-up-questions.md), [run-ai-worker](run-ai-worker.md)
- Source: `web/src/app/onboarding/[sessionId]/actions.ts`, `web/src/lib/onboarding/service.ts`, `web/src/lib/onboarding/steps.ts`
