---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[organization]]", "[[membership]]", "[[business-profile]]"]
produces: ["[[business-profile]]", "[[onboarding-session]]", "[[ai-job]]", "[[job-step]]", "[[job-dispatch]]"]
---

# Start analysis (`startAnalysis` → `website_evidence`)

Turns a website address typed into the onboarding form into a queued evidence job and an open discovery session.

## Input → Movement → Output

A signed-in user submits the website (plus optional business name and owner inputs) on `/onboarding`. The server action validates and normalizes the URL, creates an organization when the user has none, writes a business profile and a `discovering` session, queues a `website_evidence` job and hands its first step to its own invocation after the response. The user lands on `/onboarding/{sessionId}` while the crawl runs in the background.

## Why this shape

If the action crawled inline, the request would hit Vercel Hobby's 300 s limit and the owner would wait on a blank page; queuing the job and handing the first step off in `after()` is what lets discovery run alongside the crawl (D-028). Without the 24 h cap, each submit would burn a crawl plus two PageSpeed calls with no brake. Note the action lives in `web/src/app/analysis/actions.ts`, not under `app/onboarding/`.

## Steps

1. Form posts to `startAnalysis` — `web/src/app/onboarding/start-form.tsx:8`, mounted at `web/src/app/onboarding/page.tsx:20`.
2. Require a user, validate the form with zod, parse owner inputs — `web/src/app/analysis/actions.ts:20-28`.
3. Normalize the URL (error on failure) — `web/src/app/analysis/actions.ts:32-35`.
4. No organization yet: `create_organization` RPC, then `refresh()` so the layout re-renders — `web/src/app/analysis/actions.ts:39-47`.
5. `createOnboarding` — `web/src/app/analysis/actions.ts:51-58`; its rate check uses `analysesInLastDay` (`website_evidence` + `website_intel` only) against `MAX_ANALYSES_PER_DAY` — `web/src/lib/onboarding/start.ts:18-31`, enforced at `:63`.
6. Insert `business_profiles` — `web/src/lib/onboarding/start.ts:64-74`; insert `onboarding_sessions` with status `discovering` — `:76-87`.
7. `queueJob('website_evidence')`: insert `ai_jobs` with `output: initialState(worker)` and call `startJob` — `web/src/lib/onboarding/start.ts:89-95`, `:35-50`; `initialState` at `web/src/lib/pipeline/steps.ts:55-57`.
8. Admin client writes `evidence_job_id` on the session (column not granted to `authenticated`) — `web/src/lib/onboarding/start.ts:96-101`; grants at `supabase/migrations/20261010155931_onboarding_sessions_column_grants.sql:3-6`.
9. `startJob` runs `handOff(job, firstStep(worker))` in `after()` — `web/src/lib/pipeline/handoff.ts:32-34`; a hand-off that fails is failed with `HANDOFF_ERROR` — `:9`, `:18-26`.
10. Redirect to `/onboarding/{sessionId}` — `web/src/app/analysis/actions.ts:59`.

## Human gate

None. The owner's next read is the discovery page ([discovery-and-review](discovery-and-review.md)).

## If you change this

- **Hits:** the MCP `braventa_start_onboarding` tool (shares `createOnboarding`), the 24 h limit shared with [rerun-analysis](rerun-analysis.md), the evidence job sequence in [job-step-machine](job-step-machine.md), `startPlanIfReady` (reads `evidence_job_id`).
- **Does not hit:** `app/onboarding/[sessionId]/actions.ts` (the discovery steps live there, not here); `website_plan` queuing (that is `orchestrate.ts`, not `start.ts`).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding` form | Collects website, name, owner inputs |
| `startAnalysis` server action | Validates, creates org, calls `createOnboarding` |
| `createOnboarding` / `queueJob` | Shared with MCP; writes profile, session, job |
| `after()` hand-off | Starts step `crawling` in its own invocation |

## See

- Objects: [organization](../objects/tenancy/organization.md), [business-profile](../objects/onboarding/business-profile.md), [onboarding-session](../objects/onboarding/onboarding-session.md), [ai-job](../objects/pipeline/ai-job.md), [job-step](../objects/pipeline/job-step.md), [job-dispatch](../objects/pipeline/job-dispatch.md)
- Processes: [mcp-onboarding](mcp-onboarding.md), [crawl-and-profile](crawl-and-profile.md)
- Source: `web/src/app/analysis/actions.ts`, `web/src/lib/onboarding/start.ts`, `web/src/lib/pipeline/handoff.ts`
