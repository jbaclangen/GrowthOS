---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
consumes: ["[[business-profile]]", "[[ai-job]]", "[[onboarding-session]]", "[[member-role]]"]
produces: ["[[ai-job]]", "[[job-step]]", "[[job-dispatch]]"]
---

# Re-run analysis (`rerunAnalysis` → `website_intel`)

Starts a full five-step analysis again for an existing business, reusing the latest completed discovery instead of asking again.

## Input → Movement → Output

A member whose role holds `analysis.run` clicks "Re-run analysis" on a finished report. The action loads the business, checks that permission, clears stale jobs, refuses while any job for that business is queued or running, applies the 24 h cap, and queues a `website_intel` job at its first step. The job crawls, profiles, scores, plans and writes as one chain; scoring picks the latest `completed` onboarding session for the business, or none.

## Why this shape

One analysis at a time per business keeps two chains from writing the same profile; stale jobs are failed first so a cut-off run does not block forever. The cap counts `website_evidence` and `website_intel` only, the two workers that crawl and call PageSpeed. The re-run does not open a new session, so a skipped discovery stays null and the diagnosis runs on website evidence alone.

## Steps

1. Button calls `rerunAnalysis(businessProfileId)` — `web/src/app/analysis/[id]/controls.tsx:17`; hidden while running, updating or discovery open — `web/src/app/analysis/[id]/page.tsx:52`; flags computed at `web/src/app/analysis/[id]/report-data.ts:197-209`.
2. Load the profile by id (user's client; RLS) — `web/src/app/analysis/actions.ts:75-80`; refuse without `analysis.run` (`hasPermission`) — `:81` ([member-role](../objects/tenancy/member-role.md)).
3. `failStaleJobs(org)` — `web/src/app/analysis/actions.ts:85`; reaper at `web/src/lib/pipeline/jobs.ts:18-27`.
4. Active-job check with org filter and `input->>businessProfileId` — `web/src/app/analysis/actions.ts:86-93`.
5. 24 h limit via `analysesInLastDay` — `web/src/app/analysis/actions.ts:94`; counts `website_evidence` + `website_intel` — `web/src/lib/onboarding/start.ts:21-31`, `MAX_ANALYSES_PER_DAY` `:18`.
6. `queueJob('website_intel')` inserts the job and `startJob` hands `crawling` off — `web/src/app/analysis/actions.ts:96-102`; `web/src/lib/onboarding/start.ts:35-50`.
7. `refresh()` so the report shows progress — `web/src/app/analysis/actions.ts:103`.
8. Sequence: all five steps — `web/src/lib/pipeline/steps.ts:20`; intent in `web/src/lib/pipeline/website-intel.ts:64`.
9. Scoring without a session id: `loadDiscovery` takes the latest `completed` session; a `skipped` one yields null — `web/src/lib/pipeline/website-intel.ts:619-620`, `:385-387`.

## Human gate

A member with `analysis.run` clicks Re-run (the button shows for every member; the action refuses the others). No other gate until the new diagnosis waits in [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md).

## If you change this

- **Hits:** the shared 24 h counter with [start-analysis](start-analysis.md), the MCP connection (no re-run tool today, but it shares `queueJob`), the local runner (`web/scripts/run-pipeline-local.mts` queues `website_intel` the same way), [crawl-and-profile](crawl-and-profile.md) through [plan-and-write](plan-and-write.md).
- **Does not hit:** onboarding sessions (never created or updated here); `requestDiagnosisUpdate` (its own worker and guards, [revise-diagnosis](revise-diagnosis.md)). The plausible wrong neighbour is `diagnosis_update`: it re-diagnoses only, this re-crawls everything.

## Surfaces

| Surface | Role |
|---|---|
| `/analysis/[id]` header button | Visible only when idle |
| `rerunAnalysis` server action | `analysis.run`, guards + `queueJob` |
| `website_intel` job | Full chain, latest completed discovery |

## See

- Objects: [business-profile](../objects/onboarding/business-profile.md), [ai-job](../objects/pipeline/ai-job.md), [job-step](../objects/pipeline/job-step.md), [job-dispatch](../objects/pipeline/job-dispatch.md), [onboarding-session](../objects/onboarding/onboarding-session.md)
- Processes: [start-analysis](start-analysis.md), [job-step-machine](job-step-machine.md), [job-recovery](job-recovery.md), [score-and-diagnose](score-and-diagnose.md)
- Source: `web/src/app/analysis/actions.ts`, `web/src/lib/onboarding/start.ts`, `web/src/lib/pipeline/website-intel.ts`
