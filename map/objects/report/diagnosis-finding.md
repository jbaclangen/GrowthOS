---
type: object
cluster: report
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: supabase/migrations/20261010164133_diagnosis_and_plan.sql
---

# Diagnosis finding (`diagnosis_findings`)

One finding of a diagnosis, tagged by where its evidence comes from (shown as Verified, From you or Inferred) and carrying the owner's verdict.

## Why this shape

Every finding must say whether it is measured, owner-provided or the model's reasoning, and "Verified" is granted only when the finding cites a stored observation: `supabase/migrations/20261010164133_diagnosis_and_plan.sql:39-41`, `supabase/migrations/20261011160802_website_audit.sql:70-73`.

## Shape

- Table `supabase/migrations/20261010164133_diagnosis_and_plan.sql:32-52`: `position` 1–10 `:36`, `statement` ≤ 600 `:37`, `evidence` ≤ 800 `:38`, `provenance` (`verified`, `customer_provided`, `inferred`) `:41`, `confidence` `:42`, `pain_point_ids` `:43`, `owner_verdict` (`pending`, `confirmed`, `rejected`) `:44`, `owner_note` ≤ 500 `:45`, `unique (diagnosis_id, position)` `:48`, composite FK `:49-50`.
- `audit_refs` ≤ 20 `supabase/migrations/20261011160802_website_audit.sql:72-73`, `:77`; `module_id` `supabase/migrations/20261023063253_feature_modules.sql:83`, backfill rule `:86-91`.
- RLS `supabase/migrations/20261010164133_diagnosis_and_plan.sql:101-103`; the client grant allows only `owner_verdict`, `owner_note` `:111`; `touch_updated_at` `:116-117`.
- Provenance from the model's `source` (`search_console` and `analytics` are both verified): `web/src/lib/plan/priority.ts:9-21` (labels `:23-27`); citable refs (`G1` with a Search Console summary, `G2` with a GA4 summary) `web/src/lib/pipeline/prompts.ts:136-155`; uncited findings downgraded in `toFindings` `priority.ts:107-112`; built with this run's citable refs `web/src/lib/pipeline/website-intel.ts:506-514`, inserted with `module_id` `:536-537`; `moduleForFinding` `web/src/lib/modules/registry.ts:287-301`.
- Verdict: `setFindingVerdict` `web/src/app/analysis/plan-actions.ts:24-46` (needs `diagnosis.correct` `:37`, held per [member-role](../tenancy/member-role.md); note kept only on `rejected` `:40`); buttons `web/src/app/analysis/[id]/plan-controls.tsx:89`, `:113`. Verdicts feed the update step `website-intel.ts:567-572`, `:588-593`.
- Readers: `web/src/app/analysis/[id]/report-data.ts:155-162` (`select *` `:159`); tones `web/src/app/analysis/[id]/plan-section.tsx:57-61`; the basis line names Google Search Console for `G1` and Google Analytics 4 for `G2` `:87-89`; Ask Braventa, the latest diagnosis's first six with verdicts `web/src/lib/assistant/context.ts:132-140`, `:192-197`.

Citations: `supabase/migrations/20261010164133_diagnosis_and_plan.sql:32-52`, `:101-117`, `web/src/lib/pipeline/website-intel.ts:506-537`, `web/src/app/analysis/plan-actions.ts:24-46`.

## Connected to

- **owns:** nothing.
- **owned-by:** [diagnosis](diagnosis.md) (`supabase/migrations/20261010164133_diagnosis_and_plan.sql:49-50`).
- **joins:** [audit-finding](../pipeline/audit-finding.md) by ref text in `audit_refs`; [module](../modules/module-registry.md) (`module_id`); [onboarding-response](../onboarding/onboarding-response.md) by catalog id in `pain_point_ids`; [growth-plan-item](growth-plan-item.md) through `finding_positions` (`supabase/migrations/20261010164133_diagnosis_and_plan.sql:61-62`).
- **looks-like-but-is-not:** [audit-finding](../pipeline/audit-finding.md), a deterministic check result; `onboarding_follow_ups`, the owner's answers that findings may rest on.

## If you change this

- **Hits:** `toFindings` and `PROVENANCE` in `priority.ts`; `storeDiagnosis` `website-intel.ts:536-537`; `moduleForFinding` and the migration backfill (`registry.ts:291-301`, `feature_modules.sql:86-91`); `setFindingVerdict`; the corrections read `website-intel.ts:588-593`; the infographic's findings-by-evidence tile (`docs/product/MVP_SCOPE.md:57`); the assistant's finding select `context.ts:136`; the column grant `diagnosis_and_plan.sql:111`.
- **Does not hit:** `audit_findings` rows; the growth score (`web/src/lib/modules/score.ts:131-146` never reads findings).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step and diagnosis update → [score-and-diagnose](../../processes/score-and-diagnose.md), [revise-diagnosis](../../processes/revise-diagnosis.md) | writes; reads verdicts |
| `/analysis/[id]` → [confirm-diagnosis-and-plan](../../processes/confirm-diagnosis-and-plan.md) | reads; a member with `diagnosis.correct` sets verdict and note |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads |

## See

- Source: `supabase/migrations/20261010164133_diagnosis_and_plan.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `docs/architecture/DATA_MODEL.md:110`)
