---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[account-trial]]", "[[business-profile]]"]
produces: ["[[organization]]", "[[membership]]", "[[business-profile]]", "[[onboarding-session]]", "[[ai-job]]", "[[job-step]]", "[[job-dispatch]]"]
---

# Start analysis (`startAnalysis` → `website_evidence`)

Turns a website address typed into the onboarding form into a queued evidence job and an open discovery session.

## Input → Movement → Output

A signed-in user submits the website (plus optional business name and owner inputs, and, when they already have a business, whether the website is for it or for a new one) on `/onboarding`. The server action validates and normalizes the URL, resolves the business the form named or creates a new one within the account's business limit (D-062), checks the user's role may run an analysis, writes a business profile and a `discovering` session, queues a `website_evidence` job and hands its first step to its own invocation after the response. The user lands on `/onboarding/{sessionId}` while the crawl runs in the background.

## Why this shape

If the action crawled inline, the request would hit Vercel Hobby's 300 s limit and the owner would wait on a blank page; queuing the job and handing the first step off in `after()` is what lets discovery run alongside the crawl (D-028). Without the 24 h cap, each submit would burn a crawl plus two PageSpeed calls with no brake. Note the action lives in `web/src/app/analysis/actions.ts`, not under `app/onboarding/`.

## Steps

1. Form posts to `startAnalysis` — `web/src/app/onboarding/start-form.tsx:15,18`, rendered by `Start` at `web/src/app/onboarding/page.tsx:41-56`. A user with a business picks it (its id) or a new one (`new`, disabled at the limit); a user with none posts `new` — `web/src/app/onboarding/start-form.tsx:9-12,21-52`, `web/src/app/onboarding/page.tsx:38-55`.
2. Require a user, validate the form with zod, require the website-authorization checkbox, parse owner inputs — `web/src/app/analysis/actions.ts:30-40`; the checkbox (D-057) is checked at `:38` and recorded in [legal-acceptance](../objects/access/legal-acceptance.md) after the session is created, `:82`.
3. Normalize the URL (error on failure) — `web/src/app/analysis/actions.ts:42-47`.
4. Resolve the business (D-062): a posted id goes through `getCurrentOrg(user.id, id)`, and a malformed or foreign one is refused, never replaced by the current business or a new one; only a form that posts no `business` field falls back to the current business — `web/src/app/analysis/actions.ts:50-57`. `new`, or no business at all: `createOwnedBusiness` (`create_organization` RPC, the caller becomes owner, refused past the account's business limit, [account-trial](../objects/tenancy/account-trial.md)), remember it as the current business ([switch-business](switch-business.md)), then `refresh()` so the layout re-renders — `:58-69`. Then refuse unless the role holds `analysis.run` — `:70` ([member-role](../objects/tenancy/member-role.md)).
5. `createOnboarding` — `web/src/app/analysis/actions.ts:74-80`; its rate check uses `analysesInLastDay` (`website_evidence` + `website_intel` only) against `MAX_ANALYSES_PER_DAY` — `web/src/lib/onboarding/start.ts:18-31`, enforced at `:63`.
6. Insert `business_profiles` — `web/src/lib/onboarding/start.ts:64-74`; insert `onboarding_sessions` with status `discovering` — `:76-87`.
7. `queueJob('website_evidence')`: insert `ai_jobs` with `output: initialState(worker)` and call `startJob` — `web/src/lib/onboarding/start.ts:89-95`, `:35-50`; `initialState` at `web/src/lib/pipeline/steps.ts:55-57`.
8. Admin client writes `evidence_job_id` on the session (column not granted to `authenticated`) — `web/src/lib/onboarding/start.ts:96-101`; grants at `supabase/migrations/20261010155931_onboarding_sessions_column_grants.sql:3-6`.
9. `startJob` runs `handOff(job, firstStep(worker))` in `after()` — `web/src/lib/pipeline/handoff.ts:32-34`; a hand-off that fails is failed with `HANDOFF_ERROR` — `:9`, `:18-26`.
10. Redirect to `/onboarding/{sessionId}` — `web/src/app/analysis/actions.ts:83`.

## Human gate

None. The owner's next read is the discovery page ([discovery-and-review](discovery-and-review.md)).

## If you change this

- **Hits:** the MCP `braventa_start_onboarding` tool (shares `createOnboarding` and the `analysis.run` permission, `web/src/lib/mcp/tools.ts:165`), the 24 h limit shared with [rerun-analysis](rerun-analysis.md), the business limit and `create_organization` ([account-trial](../objects/tenancy/account-trial.md)), the evidence job sequence in [job-step-machine](job-step-machine.md), `startPlanIfReady` (reads `evidence_job_id`).
- **Does not hit:** `app/onboarding/[sessionId]/actions.ts` (the discovery steps live there, not here); `website_plan` queuing (that is `orchestrate.ts`, not `start.ts`).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding` form | Collects website, name, owner inputs and which business (current or new) |
| `startAnalysis` server action | Validates, resolves or creates the business, checks `analysis.run`, calls `createOnboarding` |
| `createOnboarding` / `queueJob` | Shared with MCP; writes profile, session, job |
| `after()` hand-off | Starts step `crawling` in its own invocation |

## See

- Objects: [organization](../objects/tenancy/organization.md), [business-profile](../objects/onboarding/business-profile.md), [onboarding-session](../objects/onboarding/onboarding-session.md), [ai-job](../objects/pipeline/ai-job.md), [job-step](../objects/pipeline/job-step.md), [job-dispatch](../objects/pipeline/job-dispatch.md)
- Processes: [mcp-onboarding](mcp-onboarding.md), [crawl-and-profile](crawl-and-profile.md), [switch-business](switch-business.md)
- Source: `web/src/app/analysis/actions.ts`, `web/src/lib/onboarding/start.ts`, `web/src/lib/pipeline/handoff.ts`
