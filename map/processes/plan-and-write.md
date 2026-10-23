---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[ai-job]]", "[[business-profile]]", "[[ai-worker]]"]
produces: ["[[content-calendar]]", "[[content-item]]", "[[content-status]]", "[[module-run]]", "[[ai-usage]]", "[[ai-job]]"]
---

# Plan and write (`planning` → `writing` steps)

Turns the diagnosis into a 30-day content calendar, then drafts the first five posts and parks them for approval.

## Input → Movement → Output

`planStep` reads the profile, the `discovery` and `plan_titles` artifacts left by scoring, has the `content_strategist` worker produce the plan, inserts one `content_calendars` row (30 days from tomorrow) and one `content_items` brief per day at 01:00 UTC, and hands the first five days on. `writeStep` has the `content_writer` worker draft them (escalated one tier for a regulated business), updates those items to `needs_approval` with body and `qa_notes`, records a `content_studio` module run, and ends the job `succeeded` with `step: done`.

## Why this shape

Two model calls in one invocation were part of what pushed a re-run past 300 s, so planning and writing are separate steps. Drafts land as `needs_approval`, never `scheduled` or `published`, because nothing goes out without a person (D-013); the trigger in [approve-content](approve-content.md) enforces that for clients. Matching drafts to items by scheduled instant (not string) is deliberate: Postgres returns `+00:00` timestamps.

## Steps

1. Sequence `website_plan: ["scoring", "planning", "writing"]` — `web/src/lib/pipeline/steps.ts:19`.
2. `planStep` reads `intel`, `discovery`, `plan_titles` — `web/src/lib/pipeline/website-intel.ts:733-737`.
3. `content_strategist` worker with `planPrompt` — `web/src/lib/pipeline/website-intel.ts:739-748`.
4. Start date = tomorrow (UTC) — `web/src/lib/pipeline/website-intel.ts:750-752`; insert `content_calendars` (`days: 30`, `strategy.business_profile_id`) — `:754-765`.
5. Insert `content_items` per planned day, `status: brief`, `scheduled_for` via `dayDate` (01:00 UTC) — `web/src/lib/pipeline/website-intel.ts:767-779`, `:725-730`.
6. First batch = first 5 days by `day`; artifacts `calendar_id`, `first_batch`, `starts_at` — `web/src/lib/pipeline/website-intel.ts:782-783`.
7. `writeStep` requires those artifacts, reloads `intel`, selects the calendar's items — `web/src/lib/pipeline/website-intel.ts:787-800`.
8. `content_writer` worker, `highRisk: intel.regulated.is_regulated` — `web/src/lib/pipeline/website-intel.ts:802-812`; escalation one tier up in the router — `web/src/lib/ai/router.ts:32`, `:90-91`.
9. Update matched items: `title`, `body` (+ CTA, hashtags), `qa_notes`, `status: needs_approval` — `web/src/lib/pipeline/website-intel.ts:814-834`.
10. `recordModuleRuns` for `content_studio` — `web/src/lib/pipeline/website-intel.ts:837-848`; writer `web/src/lib/modules/server.ts:36-40`.
11. Final output `{step: 'done', report_id, calendar_id, growth_score}` — `web/src/lib/pipeline/website-intel.ts:850-852`; the machine writes `succeeded` — `:937-943`.

## Human gate

None inside; every draft stops at `needs_approval` for [approve-content](approve-content.md).

## If you change this

- **Hits:** the report's 30-day plan and drafts sections (read `content_calendars` by `strategy.business_profile_id`, `content_items` by calendar), the assistant's business summary (`lib/assistant/context.ts` reads calendars), the `content_studio` module run, `approve-content` (status values).
- **Does not hit:** `diagnoses`/`growth_plan_items` (read via `plan_titles` only, never written); the growth score; `reviseDiagnosis` (keeps calendars and items untouched).

## Surfaces

| Surface | Role |
|---|---|
| `planning` step | `content_strategist` → calendar + 30 briefs |
| `writing` step | `content_writer` → 5 drafts `needs_approval` |
| `content_items.qa_notes` | Image prompt, compliance note, regulated area |

## See

- Objects: [content-calendar](../objects/report/content-calendar.md), [content-item](../objects/report/content-item.md), [content-status](../objects/report/content-status.md), [module-run](../objects/modules/module-run.md), [ai-worker](../objects/pipeline/ai-worker.md), [ai-job](../objects/pipeline/ai-job.md)
- Processes: [score-and-diagnose](score-and-diagnose.md), [approve-content](approve-content.md), [run-ai-worker](run-ai-worker.md), [job-step-machine](job-step-machine.md)
- Source: `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/ai/router.ts`
