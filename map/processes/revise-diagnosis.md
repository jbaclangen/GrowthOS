---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[diagnosis]]", "[[diagnosis-finding]]", "[[report]]", "[[business-profile]]", "[[audit-run]]", "[[audit-finding]]", "[[search-console-snapshot]]", "[[ai-worker]]"]
produces: ["[[ai-job]]", "[[diagnosis]]", "[[diagnosis-finding]]", "[[growth-plan-item]]", "[[ai-usage]]"]
---

# Revise diagnosis (`requestDiagnosisUpdate` → `diagnosis_update`)

Re-runs only the diagnosis with the owner's corrections, producing a new diagnosis version that supersedes the old one.

## Input → Movement → Output

The owner marks at least one finding wrong (with an optional note) and clicks "Update the plan with my corrections". The action checks the diagnosis is still `proposed`, clears stale jobs, refuses if a job is active, and queues a one-step `diagnosis_update` job. `reviseDiagnosis` rebuilds the evidence from the stored report and audit run, re-diagnoses with the corrections, inserts a new `diagnoses` row (`revises_id`, `version + 1`) and marks the previous one `superseded`; the score, 30-day plan and drafts are kept.

## Why this shape

A full re-run would re-crawl and re-plan for a wording correction; reusing the stored report and audit keeps it to one model call. The previous row is superseded rather than updated so the version chain stays readable. Confirmation is blocked while any finding is rejected, so the owner must either revise or clear the verdict.

## Steps

1. Owner marks a finding wrong — `web/src/app/analysis/[id]/plan-controls.tsx:89` → `setFindingVerdict` writes `owner_verdict`, `owner_note` — `web/src/app/analysis/plan-actions.ts:20-39`; client may update only those two columns — `supabase/migrations/20261010164133_diagnosis_and_plan.sql:111`; verdict values `:44`.
2. Button posts `requestDiagnosisUpdate` — `web/src/app/analysis/[id]/plan-controls.tsx:141`.
3. Preconditions: status `proposed` — `web/src/app/analysis/plan-actions.ts:100`; at least one `rejected` finding — `:102-108`.
4. `failStaleJobs`, then active-job check by `businessProfileId` with no explicit org filter (RLS scopes it) — `web/src/app/analysis/plan-actions.ts:115-122`.
5. Insert `ai_jobs` (`worker: diagnosis_update`, `input.diagnosisId`, `initialState`) and `startJob` — `web/src/app/analysis/plan-actions.ts:124-137`.
6. Sequence is `["scoring"]` only — `web/src/lib/pipeline/steps.ts:21`; `runStep` routes `scoring` to `reviseStep` for this worker — `web/src/lib/pipeline/website-intel.ts:862`, `:598-602`.
7. `reviseDiagnosis` loads the previous diagnosis (must belong to the business) — `web/src/lib/pipeline/website-intel.ts:544-550`; reads `reports.data`, `business_profiles.intelligence`, findings with verdicts — `:552-561`; missing analysis → throw — `:567`.
8. Audit context rebuilt from `audit_runs`/`audit_findings` — `web/src/lib/pipeline/website-intel.ts:573`, `:207`.
9. Corrections = confirmed statements + rejected/noted ones — `web/src/lib/pipeline/website-intel.ts:576-581`; latest completed discovery — `:582`; Search Console summary, score not recomputed — `:583-585`.
10. `diagnose` with corrections; `storeDiagnosis` with `revises: {id, version}` — `web/src/lib/pipeline/website-intel.ts:587-593`; `revises_id`/`version` columns `supabase/migrations/20261010164133_diagnosis_and_plan.sql:11-13`.
11. Previous diagnosis → `superseded` — `web/src/lib/pipeline/website-intel.ts:594`; statuses `supabase/migrations/20261010164133_diagnosis_and_plan.sql:16`. No `module_runs` are written in this path.

## Human gate

The owner marks findings wrong and asks for the update (steps 1–2). The new version is again `proposed` and waits for [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md).

## If you change this

- **Hits:** `storeDiagnosis` (shared with `scoreStep`), the report page's "updating diagnosis" state (`updatingDiagnosis` in `report-data.ts`), the `diagnoses` version chain.
- **Does not hit:** `growth_score` on the profile and `reports` (never rewritten here); `content_calendars`/`content_items` (kept); `module_runs` (none written). The plausible wrong neighbour is `rerunAnalysis`: that re-crawls and re-plans, this does not.

## Surfaces

| Surface | Role |
|---|---|
| `/analysis/[id]` plan controls | Mark wrong, request update |
| `requestDiagnosisUpdate` | Guards and queues `diagnosis_update` |
| `reviseStep` / `reviseDiagnosis` | One `website_auditor` call, new version |

## See

- Objects: [diagnosis](../objects/report/diagnosis.md), [diagnosis-finding](../objects/report/diagnosis-finding.md), [growth-plan-item](../objects/report/growth-plan-item.md), [report](../objects/report/report.md), [audit-run](../objects/pipeline/audit-run.md), [ai-job](../objects/pipeline/ai-job.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Processes: [score-and-diagnose](score-and-diagnose.md), [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md), [job-step-machine](job-step-machine.md)
- Source: `web/src/app/analysis/plan-actions.ts`, `web/src/lib/pipeline/website-intel.ts`
