---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261010164133_diagnosis_and_plan.sql
---

# Diagnosis (`diagnoses`)

The model's statement of what is holding the business back, which the owner confirms or corrects; each correction produces a new version.

## Why this shape

Owner corrections re-run only the diagnosis step, so a correction is a new row that revises the old one rather than an edit, and the owner's client may change only the review columns: `supabase/migrations/20261010164133_diagnosis_and_plan.sql:1-3`, `:11-13`, `:108-110`.

## Shape

- Table `supabase/migrations/20261010164133_diagnosis_and_plan.sql:5-30`: `report_id` `:9`, `job_id` `:10`, `revises_id` self-reference `:12`, `version` `:13`, `summary` ≤ 1500 `:14`, `missing_info` `:15`, `status` (`proposed`, `confirmed`, `superseded`) `:16`, `confirmed_at`, `confirmed_by` `:17-18`, composite FK to `business_profiles` `:22-23`.
- RLS read and update for members `:98-100`; column grant limited to `status`, `confirmed_at`, `confirmed_by` `:109-110`; `touch_updated_at` `:114-115`.
- Pipeline writes: `storeDiagnosis` insert `web/src/lib/pipeline/website-intel.ts:505-519` (`version` from the revised row `:513`); the update step marks the previous row `superseded` `:594`.
- Review writes: `confirmDiagnosis` `web/src/app/analysis/plan-actions.ts:59-101` (`confirmed` `:85-89`; the earlier confirmed one `superseded` `:93-98`; blocked while any finding is rejected `:73-75`); `requestDiagnosisUpdate` needs `proposed` and at least one rejected finding `:104-117`. Both need `diagnosis.correct` (`:63`, `:108`; who holds it: [member-role](../tenancy/member-role.md), `docs/architecture/ROLES_AND_PERMISSIONS.md:64`).
- Readers: report loader, newest `proposed` or `confirmed`, two rows `web/src/app/analysis/[id]/report-data.ts:119-129`; Ask Braventa `web/src/lib/assistant/context.ts:106-112`; row type `web/src/app/analysis/[id]/plan-section.tsx:13-20`.

Citations: `supabase/migrations/20261010164133_diagnosis_and_plan.sql:5-30`, `:98-115`, `web/src/lib/pipeline/website-intel.ts:505-519`, `:542-595`, `web/src/app/analysis/plan-actions.ts:48-149`.

## Connected to

- **owns:** [diagnosis-finding](diagnosis-finding.md) (`:49-50`); [growth-plan-item](growth-plan-item.md) (`:87-88`).
- **owned-by:** [business-profile](../onboarding/business-profile.md) (`:22-23`); [organization](../tenancy/organization.md).
- **joins:** [report](report.md) (`:9`); [ai-job](../pipeline/ai-job.md) (`:10`); itself through `revises_id` (`:12`).
- **looks-like-but-is-not:** [report](report.md), the score and evidence snapshot; the `diagnosis_update` job ([ai-job](../pipeline/ai-job.md)), which creates a revision but is not one.

## If you change this

- **Hits:** `storeDiagnosis` and `reviseDiagnosis` (`website-intel.ts:505-519`, `:544-550`, `:594`); `plan-actions.ts` confirm and update; the loader select `report-data.ts:120-126`; `context.ts:106-112`; `DiagnosisRow` `plan-section.tsx:13-20`; the column grant `:110`.
- **Does not hit:** `growth_plan_items.final_priority`, which confirm writes on the items, not here (`plan-actions.ts:77-83`); the 30-day plan and drafts (`website-intel.ts:540-541`).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step → [score-and-diagnose](../../processes/score-and-diagnose.md) | writes |
| Diagnosis update → [revise-diagnosis](../../processes/revise-diagnosis.md) | writes (new version, supersedes) |
| `/analysis/[id]` → [confirm-diagnosis-and-plan](../../processes/confirm-diagnosis-and-plan.md) | reads; a member with `diagnosis.correct` confirms or requests an update |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads |

## See

- Source: `supabase/migrations/20261010164133_diagnosis_and_plan.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:94`)
