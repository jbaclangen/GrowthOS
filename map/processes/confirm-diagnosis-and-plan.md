---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[diagnosis]]", "[[diagnosis-finding]]", "[[growth-plan-item]]", "[[membership]]"]
produces: ["[[diagnosis]]", "[[diagnosis-finding]]", "[[growth-plan-item]]"]
---

# Confirm diagnosis and plan (`setFindingVerdict`, `confirmDiagnosis`, `setPlanItemStatus`)

Lets the owner judge each finding, lock the plan order by confirming, and then work the plan item by item.

## Input → Movement → Output

On `/analysis/[id]` the owner marks findings right or wrong, then confirms. `confirmDiagnosis` refuses while any finding is rejected, writes `final_priority` on every plan item, sets the diagnosis `confirmed` (`confirmed_at`/`confirmed_by`) and supersedes any earlier confirmed diagnosis for the business. Afterwards `setPlanItemStatus` moves items among `proposed`, `accepted`, `dismissed`, `done`, with `proposed` as the undo.

## Why this shape

All three actions run with the user's client, so RLS and column grants, not application code, bound what a client can change: only verdict and note on findings; only status, confirmation fields on diagnoses; only status fields and `final_priority` on items. Everything else comes from the pipeline. Blocking confirmation on a rejected finding forces the owner through [revise-diagnosis](revise-diagnosis.md) rather than confirming a plan built on a finding they called wrong.

## Steps

1. Finding verdict buttons call `setFindingVerdict` — `web/src/app/analysis/[id]/plan-controls.tsx:89`; the action validates, writes `owner_verdict` and `owner_note` (note kept only for `rejected`) — `web/src/app/analysis/plan-actions.ts:20-39`; allowed verdicts `:16`, column check `supabase/migrations/20261010164133_diagnosis_and_plan.sql:44`.
2. "Confirm diagnosis and plan" calls `confirmDiagnosis` — `web/src/app/analysis/[id]/plan-controls.tsx:155`.
3. Diagnosis must be `proposed` — `web/src/app/analysis/plan-actions.ts:56`; any `rejected` finding blocks — `:65-67`.
4. `finalPriorities` ranks items; each gets `final_priority` — `web/src/app/analysis/plan-actions.ts:69-75`; column bounds `supabase/migrations/20261010164133_diagnosis_and_plan.sql:80`.
5. Diagnosis → `confirmed` with `confirmed_at`, `confirmed_by`, conditional on still `proposed` — `web/src/app/analysis/plan-actions.ts:77-82`; statuses `supabase/migrations/20261010164133_diagnosis_and_plan.sql:16`.
6. Earlier confirmed diagnoses for the business → `superseded` — `web/src/app/analysis/plan-actions.ts:85-90`.
7. Plan item buttons call `setPlanItemStatus` — `web/src/app/analysis/[id]/plan-controls.tsx:171`; action writes `status`, `status_changed_at`, `status_changed_by` (null when undoing to `proposed`) — `web/src/app/analysis/plan-actions.ts:143-159`; allowed values `:17`, column check `supabase/migrations/20261010164133_diagnosis_and_plan.sql:82-84`.
8. What a client may touch: RLS `members read`/`members update` — `supabase/migrations/20261010164133_diagnosis_and_plan.sql:98-106`; write grants revoked then re-granted per column — `:109-112`.

## Human gate

The owner, at every step: verdicts, confirmation, item status. Nothing here runs without a click.

## If you change this

- **Hits:** `requestDiagnosisUpdate` (same `proposed` and rejected-finding rules in reverse), the report page's plan ordering (reads `final_priority`), the assistant's summary of plan progress, the column grants (an extra client-writable column needs a migration).
- **Does not hit:** the pipeline's `storeDiagnosis` (inserts with the admin client, unaffected by grants); `content_items` approval (separate trigger, [approve-content](approve-content.md)).

## Surfaces

| Surface | Role |
|---|---|
| `/analysis/[id]` plan section | Verdicts, confirm, item actions |
| `plan-actions.ts` | Three server actions via the user's client |
| Column grants (`diagnosis_and_plan` migration) | What a client may update |

## See

- Objects: [diagnosis](../objects/report/diagnosis.md), [diagnosis-finding](../objects/report/diagnosis-finding.md), [growth-plan-item](../objects/report/growth-plan-item.md), [membership](../objects/tenancy/membership.md)
- Processes: [score-and-diagnose](score-and-diagnose.md), [revise-diagnosis](revise-diagnosis.md)
- Source: `web/src/app/analysis/plan-actions.ts`, `web/src/app/analysis/[id]/plan-controls.tsx`, `supabase/migrations/20261010164133_diagnosis_and_plan.sql`
