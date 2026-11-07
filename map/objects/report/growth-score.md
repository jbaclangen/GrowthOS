---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: web/src/lib/modules/score.ts
---

# Growth score (`computeGrowthScore` / `business_profiles.growth_score`)

The 0–100 number on the report: a renormalized weighted mean over the parts of every enabled feature module that has evidence, stored on the profile and in the report.

## Why this shape

Modules can be absent (no PageSpeed, no Search Console) or switched off per organization, so the mean renormalizes over the parts present, and a version marks the formula so runs under different versions are not compared: `web/src/lib/modules/score.ts:3-14`, `:16-19`.

## Shape

- `SCORE_VERSION = 2` `web/src/lib/modules/score.ts:20` (history `:16-19`).
- Parts and weights: conversion 0.25 / 0.25 / 0.15 `:29-38` (module weight 0.65, `web/src/lib/modules/registry.ts:89-91`); website SEO from PageSpeed mobile 0.15 / 0.12 / 0.04 / 0.04 `:42-54` (0.35, `registry.ts:76-77`); search visibility 0.04 / 0.02 / 0.02 / 0.01 / 0.01 `:75-93` (0.1, `registry.ts:115-118`; no parts with `little_data` `:77`).
- `scoreEvidence` fixes the summing order `:95-108`; `weightedMean` `:110-116`; `subScore` `:118-121`; `computeGrowthScore` over enabled modules with parts `:131-140`; `modulesUsed` for older reports `:142-147`.
- Enabled set: `enabledModuleIds` `registry.ts:257-266`; `enabledModules` `web/src/lib/modules/server.ts:9-19`.
- Computed in the scoring step `web/src/lib/pipeline/website-intel.ts:625-633` (null result fails the step `:632`); not recomputed by the diagnosis update `:583-584`.
- Stored: `business_profiles.growth_score` 0–100 and `analyzed_at` (`supabase/migrations/20261010061028_foundation.sql:90-91`, written `website-intel.ts:635-639`); `reports.data` `growth_score`, `score_version`, `score_modules`, `module_scores` `:650-655`; `module_runs.sub_score` (`supabase/migrations/20261023063253_feature_modules.sql:54-56`; `website-intel.ts:348`, `:687`, `:699`).
- Shown: "Based on N modules" `web/src/app/analysis/[id]/infographic.tsx:203`; dashboard `web/src/app/dashboard/page.tsx:33`.

Citations: `web/src/lib/modules/score.ts:20-147`, `web/src/lib/modules/registry.ts:77`, `:91`, `:118`, `:263-266`, `web/src/lib/pipeline/website-intel.ts:625-655`.

## Connected to

- **owns:** nothing.
- **owned-by:** [business-profile](../onboarding/business-profile.md) (the column); [report](report.md) (`data`).
- **joins:** [module](../modules/module-registry.md) (`scoreWeight`); [module-run](../modules/module-run.md) (`sub_score`); [search-console-snapshot](../integrations/search-console-snapshot.md) through `searchConsoleSummaryForPrompt` (`web/src/lib/integrations/search-console.ts:575-583`); PageSpeed mobile from the crawl evidence (`website-intel.ts:258`).
- **looks-like-but-is-not:** `calculated_priority` on plan items (`web/src/lib/plan/priority.ts:37-41`); the model's assessed `scores`, an input kept in the report (`website-intel.ts:656`); `audit_findings.severity`.

## If you change this

- **Hits:** the `SCORE_VERSION` bump rule (`score.ts:16-19`; `CLAUDE.md` feature-module rule); `score.test.ts` equivalence (`:14`); the scoring step `website-intel.ts:628-634`; `module_runs.details.score_version` (`:351`, `:690`, `:703`); `docs/architecture/FEATURE_MODULES.md` §4; the infographic label; the MCP status note (`web/src/lib/mcp/tools.ts:446-447`).
- **Does not hit:** diagnosis findings and plan items (model output); `audit_runs.audit_version` (a separate version, `web/src/lib/audit/checks.ts:12-13`).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step → [score-and-diagnose](../../processes/score-and-diagnose.md) | computes; writes |
| `/analysis/[id]` and `/dashboard` | reads |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads `business_profiles.growth_score` (`web/src/lib/assistant/context.ts:38`, `:79`, `:170`) |
| MCP `braventa_get_status` → [mcp-onboarding](../../processes/mcp-onboarding.md) | reads `reports.data.growth_score` with a fixed note (`web/src/lib/mcp/tools.ts:445-447`) |

## See

- Source: `web/src/lib/modules/score.ts`
- As built: `docs/architecture/FEATURE_MODULES.md` (§4 at `:51`)
