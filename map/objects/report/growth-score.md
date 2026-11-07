---
type: object
cluster: report
universe: live
status: verified
verified: 2026-11-08
commit: 2dd74b3
entity: web/src/lib/modules/score.ts
---

# Growth score (`computeGrowthScore` / `business_profiles.growth_score`)

The 0–100 number on the report: a renormalized weighted mean over the parts of every enabled feature module that has evidence, stored on the profile and in the report.

## Why this shape

Modules can be absent (no PageSpeed, no Search Console, no GA4) or switched off per organization, so the mean renormalizes over the parts present, and a version marks the formula so runs under different versions are not compared: `web/src/lib/modules/score.ts:3-15`, `:17-21`.

## Shape

- `SCORE_VERSION = 3` `web/src/lib/modules/score.ts:22` (history `:17-21`; 3 = Analytics' parts join the sum).
- Parts and weights: conversion 0.25 / 0.25 / 0.15 `score.ts:30-40` (module weight 0.65, `web/src/lib/modules/registry.ts:90-92`); website SEO from PageSpeed mobile 0.15 / 0.12 / 0.04 / 0.04 `score.ts:42-56` (0.35, `registry.ts:77-78`); search visibility 0.04 / 0.02 / 0.02 / 0.01 / 0.01 `score.ts:73-95` (0.1, `registry.ts:116-119`; no parts with `little_data` `score.ts:79`); analytics: data flowing 0.03, key events 0.03, engagement 0.02 and trend 0.02 (the last two only with 10+ sessions) `score.ts:97-129` (0.1, `registry.ts:203-205`; no parts for a property created inside the window `score.ts:113`).
- `scoreEvidence` fixes the summing order `score.ts:131-146`; `weightedMean` `:148-154`; `subScore` `:156-159`; `computeGrowthScore` over enabled modules with parts `:169-178`; `modulesUsed` for older reports `:180-185`.
- Explained in words for readers without the report page: `growthScoreNote` over `modulesUsed`, module labels (`registry.ts:248-250`) plus `SCORE_SOURCES` — `score.ts:187-199`.
- Blend wording on the report: `scoreBlend(modules, "short" | "long")` joins the `BLEND` phrases of the modules used only, fixed order measured / assessed / search data / website analytics — `score.ts:201-215` (`BLEND` `:205-210`).
- Enabled set: `enabledModuleIds` `registry.ts:260-269`; `enabledModules` `web/src/lib/modules/server.ts:9-19`.
- Computed in the scoring step `web/src/lib/pipeline/website-intel.ts:639-647` (null result fails the step `:646`); not recomputed by the diagnosis update `:595-596`.
- Stored: `business_profiles.growth_score` 0–100 and `analyzed_at` (`supabase/migrations/20261010061028_foundation.sql:90-91`, written `website-intel.ts:649-653`); `reports.data` `growth_score`, `score_version`, `score_modules`, `module_scores` `:664-669`; `module_runs.sub_score` (`supabase/migrations/20261023063253_feature_modules.sql:54-56`; `website-intel.ts:351`, `:705`, `:717`, `:736`).
- Shown: score tile `web/src/app/analysis/[id]/infographic.tsx` — short blend `:169`, `:205-207`; "Based on N modules" `:208-210`; Search visibility row from `reports.data.module_scores.search_visibility` only when it counted `:170-171`, `:183`. Scores section `web/src/app/analysis/[id]/report-sections.tsx` — long blend "A blend of …" / "Based on … only" `:53-61`; Search visibility bar `:56`, `:77`. Analytics has no bar; its sub-score is stored in `module_scores` but not shown. Dashboard `web/src/app/dashboard/page.tsx:33`.

Citations: `web/src/lib/modules/score.ts:22-215`, `web/src/lib/modules/registry.ts:78`, `:92`, `:119`, `:205`, `:248-250`, `:266-269`, `web/src/lib/pipeline/website-intel.ts:639-669`, `web/src/lib/mcp/tools.ts:446-448`.

## Connected to

- **owns:** nothing.
- **owned-by:** [business-profile](../onboarding/business-profile.md) (the column); [report](report.md) (`data`).
- **joins:** [module](../modules/module-registry.md) (`scoreWeight`); [module-run](../modules/module-run.md) (`sub_score`); [search-console-snapshot](../integrations/search-console-snapshot.md) through `searchConsoleSummaryForPrompt` (`web/src/lib/integrations/search-console.ts:503-511`); [analytics-snapshot](../integrations/analytics-snapshot.md) through `analyticsSummaryForPrompt` (`web/src/lib/integrations/google-analytics.ts:523-531`); PageSpeed mobile from the crawl evidence (`website-intel.ts:261`).
- **looks-like-but-is-not:** `calculated_priority` on plan items (`web/src/lib/plan/priority.ts:37-41`); the model's assessed `scores`, an input kept in the report (`website-intel.ts:670`); `audit_findings.severity`.

## If you change this

- **Hits:** the `SCORE_VERSION` bump rule (`score.ts:17-21`; `CLAUDE.md` feature-module rule); `score.test.ts` equivalence (stated at `score.ts:15`); the scoring step `website-intel.ts:642-647`; `module_runs.details.score_version` (`:354`, `:708`, `:721`, `:740`); `docs/architecture/FEATURE_MODULES.md` §4; the report's blend wording (a scored module without a `BLEND` entry, `score.ts:205-210`, is left out of the tile and Scores section text, `:213`); the per-module bars (only Search visibility has one, `infographic.tsx:185`, `report-sections.tsx:78`); the assistant summary (only Search visibility's sub-score is passed, `web/src/lib/assistant/context.ts:180`, `web/src/lib/assistant/prompt.ts:138`); the help text naming parts and weights (`web/src/lib/assistant/knowledge.ts:158`, then `npm run help:doc`); the MCP status note, built by `growthScoreNote` (`score.ts:187-199`; a scored module without a `SCORE_SOURCES` entry is named by its label only, `:197`) and returned at `web/src/lib/mcp/tools.ts:448`.
- **Does not hit:** diagnosis findings and plan items (model output); `audit_runs.audit_version` (a separate version, `web/src/lib/audit/checks.ts:12-13`).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step → [score-and-diagnose](../../processes/score-and-diagnose.md) | computes; writes |
| `/analysis/[id]` and `/dashboard` | reads |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads `business_profiles.growth_score` (`web/src/lib/assistant/context.ts:40`, `:81`, `:176`) and `reports.data.score_modules` / `module_scores` through `modulesUsed` and `moduleLabel` (`:152-159`, `:177`, `:180`); prompt lines "Growth score based on" and Search visibility (`web/src/lib/assistant/prompt.ts:131`, `:137`) |
| MCP `braventa_get_status` → [mcp-onboarding](../../processes/mcp-onboarding.md) | reads `reports.data.growth_score` (`web/src/lib/mcp/tools.ts:446`) with a note naming the modules the score used, `growthScoreNote(modulesUsed(report.data))`, null without `data` (`:448`) |

## See

- Source: `web/src/lib/modules/score.ts`
- As built: `docs/architecture/FEATURE_MODULES.md` (§4 at `:51`); the MCP note in `docs/developers/MCP_AND_API.md:120`
