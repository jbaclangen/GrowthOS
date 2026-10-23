---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010164133_diagnosis_and_plan.sql
---

# Growth plan item (`growth_plan_items`)

One action of the single prioritized growth plan, with four priorities (owner, model, calculated, final) and the owner's accept / dismiss / done status.

## Why this shape

The spec keeps the owner's priority, the model's ranking, a score computed in code and the order the owner confirmed as separate columns, so the calculated score never overrides the owner: `supabase/migrations/20261010164133_diagnosis_and_plan.sql:75-80`, `web/src/lib/plan/priority.ts:3-5`.

## Shape

- Table `supabase/migrations/20261010164133_diagnosis_and_plan.sql:54-92`: content fields `:58-69`; `impact`, `urgency`, `effort` 1–5 `:70-73`; `urgency_from_owner` `:72`; `confidence` `:74`; `customer_priority` 1–3, `ai_priority` 1–20, `calculated_priority`, `final_priority` 1–20 `:77-80`; `status` (`proposed`, `accepted`, `dismissed`, `done`) `:82`; `status_changed_at`, `status_changed_by` `:83-84`; composite FK `:87-88`. `module_id` `supabase/migrations/20261023063253_feature_modules.sql:84`, backfill by `area` `:93-103`.
- RLS `:104-106`; the client grant allows only `status`, `status_changed_*`, `final_priority` `:112`; `touch_updated_at` `:118-119`.
- Maths: `calculatedPriority` `web/src/lib/plan/priority.ts:37-41`; `OWNER_URGENCY` `:29-30`; `MAX_PLAN_ITEMS` `:33`; `toPlanItems` `:123`, `orderPlan` `:150`, `finalPriorities` `:162`.
- Pipeline insert `web/src/lib/pipeline/website-intel.ts:503`, `:526-534` (`moduleForArea` `web/src/lib/modules/registry.ts:268-276`); titles handed to the planning step `:718`, `:737`.
- Status and order: `setPlanItemStatus` `web/src/app/analysis/plan-actions.ts:151-171` (needs `plan_items.update_any` `:158`; `plan_items.update_own` waits on an assignee, `docs/architecture/ROLES_AND_PERMISSIONS.md:65-66`; holders per [member-role](../tenancy/member-role.md)); `final_priority` set on confirm `:77-83` (gated by `diagnosis.correct` `:63`); buttons `web/src/app/analysis/[id]/plan-controls.tsx:166-171`.
- Readers: `web/src/app/analysis/[id]/report-data.ts:163-170`; row type `web/src/app/analysis/[id]/plan-section.tsx:50-55`.

Citations: `supabase/migrations/20261010164133_diagnosis_and_plan.sql:54-92`, `:104-119`, `web/src/lib/plan/priority.ts:37-41`, `web/src/lib/pipeline/website-intel.ts:526-534`, `web/src/app/analysis/plan-actions.ts:77-83`, `:152-171`.

## Connected to

- **owns:** nothing.
- **owned-by:** [diagnosis](diagnosis.md) (`:87-88`).
- **joins:** [diagnosis-finding](diagnosis-finding.md) through `finding_positions` (`:61-62`); [module](../modules/module-registry.md) (`module_id`); the solution catalog `web/src/lib/onboarding/catalog.ts` through `solution_ids` (`priority.ts:1`, `:172`); [onboarding-response](../onboarding/onboarding-response.md) through `pain_point_ids` and `customer_priority`.
- **looks-like-but-is-not:** [content-item](content-item.md), the 30-day plan's posts; `reports.data.opportunities`, the pre-2026-10-11 shape (`docs/architecture/DATA_MODEL.md:90`).

## If you change this

- **Hits:** the insert column list `website-intel.ts:527-533`; `priority.ts` and its tests; `plan-actions.ts` confirm and status; the loader select `report-data.ts:166-168`; `plan-section.tsx:50-55`; the backfill rule `feature_modules.sql:93-103` and `moduleForArea`; the column grant `:112`.
- **Does not hit:** `diagnoses.status`; the 30-day plan (the planning step reads only titles, `website-intel.ts:737`).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step → [score-and-diagnose](../../processes/score-and-diagnose.md) | writes |
| `/analysis/[id]` → [confirm-diagnosis-and-plan](../../processes/confirm-diagnosis-and-plan.md) | reads; a member with `plan_items.update_any` sets status; confirm sets final order |
| Infographic plan-progress tile (`docs/product/MVP_SCOPE.md:57`) | reads |

## See

- Source: `supabase/migrations/20261010164133_diagnosis_and_plan.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:98`)
