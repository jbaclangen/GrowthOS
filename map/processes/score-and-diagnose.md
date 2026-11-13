---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[ai-job]]", "[[business-profile]]", "[[onboarding-session]]", "[[onboarding-response]]", "[[onboarding-follow-up]]", "[[module-registry]]", "[[organization-module]]", "[[search-console-snapshot]]", "[[analytics-snapshot]]", "[[ai-worker]]"]
produces: ["[[growth-score]]", "[[report]]", "[[diagnosis]]", "[[diagnosis-finding]]", "[[growth-plan-item]]", "[[module-run]]", "[[business-profile]]", "[[ai-usage]]"]
---

# Score and diagnose (`scoring` step: `scoreStep`)

Combines the stored evidence, the owner's discovery and the enabled modules into one model call that yields the growth score, the diagnosis and the growth plan.

## Input → Movement → Output

`scoreStep` reads the evidence (from the evidence job's output for `website_plan`, from its own state for `website_intel`), the profile's `intelligence`, the latest completed discovery and the organization's enabled modules, plus a Search Console summary when `search_visibility` is enabled and a Google Analytics 4 summary when `analytics` is enabled. The `website_auditor` worker diagnoses; `computeGrowthScore` folds the evidence over the enabled modules. It writes the score on the profile, a `reports` row, a `diagnoses` row with findings and plan items (each tagged with a `module_id`), and `module_runs`.

## Why this shape

The score is computed from module evidence, not from the model's numbers alone, so a tier or override change shows as a different `score_version`/`score_modules` rather than as the business improving (D-051). Enabled modules are read before the model call so a failed read does not waste one. A null score throws rather than storing zero, because "no module has evidence" is a failure, not a result.

## Steps

1. Evidence: `website_plan` reads the evidence job's output; missing → throw — `web/src/lib/pipeline/website-intel.ts:619-631`.
2. `loadIntel` parses `business_profiles.intelligence` — `web/src/lib/pipeline/website-intel.ts:632`, `:364-374`.
3. `loadDiscovery`: the plan's own session, or (re-run, no session id) the latest `completed` one; anything else → null — `web/src/lib/pipeline/website-intel.ts:634`, `:377-390`.
4. `enabledModules` (tier + `organization_modules` overrides; throws on read failure) — `web/src/lib/pipeline/website-intel.ts:639`; `web/src/lib/modules/server.ts:11-19`; `enabledModuleIds` `web/src/lib/modules/registry.ts:266-269`.
5. Search Console summary only if `search_visibility` is enabled, GA4 summary only if `analytics` is enabled, read in parallel — `web/src/lib/pipeline/website-intel.ts:640`, `:436-438`, `:442-444`; `searchConsoleSummaryForPrompt` `web/src/lib/integrations/search-console.ts:503-511`; `analyticsSummaryForPrompt` `web/src/lib/integrations/google-analytics.ts:523-531`.
6. `diagnose`: `website_auditor` with `diagnosisPrompt` — `web/src/lib/pipeline/website-intel.ts:641`, `:447-482`; prompt at `web/src/lib/pipeline/prompts.ts:270` (fenced `G1` block `:299-310`, `G2` block `:311-321`; without either summary the prompt is unchanged).
7. `computeGrowthScore(scoreEvidence(...), enabled)`; null → throw — `web/src/lib/pipeline/website-intel.ts:642-647`; `web/src/lib/modules/score.ts:133-146`, `:171-178`, `SCORE_VERSION` `:22`.
8. Update `business_profiles.growth_score` and `analyzed_at` — `web/src/lib/pipeline/website-intel.ts:649-653`.
9. Insert `reports` with `data.{score_version, score_modules, module_scores, search_console, google_analytics, ...}` — `web/src/lib/pipeline/website-intel.ts:655-692` (`search_console` at `:678-680`, `google_analytics` at `:682-684`).
10. `storeDiagnosis`: insert `diagnoses` — `web/src/lib/pipeline/website-intel.ts:694`, `:494-531`; findings with `moduleForFinding`, items with `moduleForArea` — `:533-547`; rules at `web/src/lib/modules/registry.ts:291-301`, `:275-279`.
11. `module_runs` for `conversion` and, when enabled, `search_visibility` and `analytics` — `web/src/lib/pipeline/website-intel.ts:696-748`.
12. Artifacts for the next step: `report_id`, `growth_score`, `plan_titles`, `discovery` — `web/src/lib/pipeline/website-intel.ts:750-758`.

## Human gate

None here. The output waits for the owner in [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md) and [revise-diagnosis](revise-diagnosis.md).

## If you change this

- **Hits:** `planStep` (reads `plan_titles` and `discovery` artifacts), `reviseDiagnosis` (reads `reports.data` as evidence), the report page's score history (`score_version`), `SCORE_VERSION` bumps, `module_id` backfill rules.
- **Readers of `score_modules`/`module_scores`** (via `modulesUsed`, `web/src/lib/modules/score.ts:182-185`): the score tile and Scores section word the blend with `scoreBlend` and show `module_scores.search_visibility` and `module_scores.analytics` only when they counted — `web/src/app/analysis/[id]/infographic.tsx:168-173`, `web/src/app/analysis/[id]/report-sections.tsx:54-57`; Ask Braventa's summary — `web/src/lib/assistant/context.ts:165`, `:183`, `:186-187`; MCP status note — `web/src/lib/mcp/tools.ts:448`.
- **New scored module:** add it to `BLEND` (`web/src/lib/modules/score.ts:205-210`, used by `scoreBlend` `:212-215`) and `SCORE_SOURCES` (`:188-193`), or the tile, Scores section and MCP note won't name it.
- **Does not hit:** `crawlStep`/`profileStep` (they never read the score); Search Console and GA4 syncs (this reads a snapshot, never fetches); HubSpot counts (the `crm` module is not live, `web/src/lib/modules/registry.ts:185,190`, and D-060 is Proposed, so this step never reads them; see [module-registry](../objects/modules/module-registry.md)).

## Surfaces

| Surface | Role |
|---|---|
| `scoring` step | One `website_auditor` call |
| `reports.data` | Score, version, modules used and their sub-scores, which snapshot was used |
| `diagnoses` + findings + items | What the owner reviews |
| `module_runs` | Record of which modules ran |

## See

- Objects: [growth-score](../objects/report/growth-score.md), [report](../objects/report/report.md), [diagnosis](../objects/report/diagnosis.md), [diagnosis-finding](../objects/report/diagnosis-finding.md), [growth-plan-item](../objects/report/growth-plan-item.md), [module-registry](../objects/modules/module-registry.md), [organization-module](../objects/modules/organization-module.md), [module-run](../objects/modules/module-run.md), [search-console-snapshot](../objects/integrations/search-console-snapshot.md), [analytics-snapshot](../objects/integrations/analytics-snapshot.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Processes: [crawl-and-profile](crawl-and-profile.md), [plan-and-write](plan-and-write.md), [sync-search-console](sync-search-console.md), [sync-google-analytics](sync-google-analytics.md), [run-ai-worker](run-ai-worker.md)
- Source: `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/modules/score.ts`, `web/src/lib/modules/registry.ts`, `web/src/lib/modules/server.ts`
