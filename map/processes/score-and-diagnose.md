---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[ai-job]]", "[[business-profile]]", "[[onboarding-session]]", "[[onboarding-response]]", "[[onboarding-follow-up]]", "[[module-registry]]", "[[organization-module]]", "[[search-console-snapshot]]", "[[ai-worker]]"]
produces: ["[[growth-score]]", "[[report]]", "[[diagnosis]]", "[[diagnosis-finding]]", "[[growth-plan-item]]", "[[module-run]]", "[[business-profile]]", "[[ai-usage]]"]
---

# Score and diagnose (`scoring` step: `scoreStep`)

Combines the stored evidence, the owner's discovery and the enabled modules into one model call that yields the growth score, the diagnosis and the growth plan.

## Input → Movement → Output

`scoreStep` reads the evidence (from the evidence job's output for `website_plan`, from its own state for `website_intel`), the profile's `intelligence`, the latest completed discovery and the organization's enabled modules, plus a Search Console summary when `search_visibility` is enabled. The `website_auditor` worker diagnoses; `computeGrowthScore` folds the evidence over the enabled modules. It writes the score on the profile, a `reports` row, a `diagnoses` row with findings and plan items (each tagged with a `module_id`), and `module_runs`.

## Why this shape

The score is computed from module evidence, not from the model's numbers alone, so a tier or override change shows as a different `score_version`/`score_modules` rather than as the business improving (D-051). Enabled modules are read before the model call so a failed read does not waste one. A null score throws rather than storing zero, because "no module has evidence" is a failure, not a result.

## Steps

1. Evidence: `website_plan` reads the evidence job's output; missing → throw — `web/src/lib/pipeline/website-intel.ts:605-617`.
2. `loadIntel` parses `business_profiles.intelligence` — `web/src/lib/pipeline/website-intel.ts:618`, `:361-371`.
3. `loadDiscovery`: the plan's own session, or (re-run, no session id) the latest `completed` one; anything else → null — `web/src/lib/pipeline/website-intel.ts:620`, `:374-387`.
4. `enabledModules` (tier + `organization_modules` overrides; throws on read failure) — `web/src/lib/pipeline/website-intel.ts:625`; `web/src/lib/modules/server.ts:11-19`; `enabledModuleIds` `web/src/lib/modules/registry.ts:263-266`.
5. Search Console summary only if `search_visibility` is enabled — `web/src/lib/pipeline/website-intel.ts:626`, `:433-435`; `searchConsoleSummaryForPrompt` `web/src/lib/integrations/search-console.ts:575-583`.
6. `diagnose`: `website_auditor` with `diagnosisPrompt` — `web/src/lib/pipeline/website-intel.ts:627`, `:438-471`; prompt at `web/src/lib/pipeline/prompts.ts:266`.
7. `computeGrowthScore(scoreEvidence(...), enabled)`; null → throw — `web/src/lib/pipeline/website-intel.ts:628-633`; `web/src/lib/modules/score.ts:97`, `:133-140`, `SCORE_VERSION` `:20`.
8. Update `business_profiles.growth_score` and `analyzed_at` — `web/src/lib/pipeline/website-intel.ts:635-639`.
9. Insert `reports` with `data.{score_version, score_modules, module_scores, search_console, ...}` — `web/src/lib/pipeline/website-intel.ts:641-674` (`search_console` at `:664-666`).
10. `storeDiagnosis`: insert `diagnoses` — `web/src/lib/pipeline/website-intel.ts:676`, `:483-519`; findings with `moduleForFinding`, items with `moduleForArea` — `:523-536`; rules at `web/src/lib/modules/registry.ts:286-295`, `:272-276`.
11. `module_runs` for `conversion` and, when enabled, `search_visibility` — `web/src/lib/pipeline/website-intel.ts:681-711`.
12. Artifacts for the next step: `report_id`, `growth_score`, `plan_titles`, `discovery` — `web/src/lib/pipeline/website-intel.ts:713-721`.

## Human gate

None here. The output waits for the owner in [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md) and [revise-diagnosis](revise-diagnosis.md).

## If you change this

- **Hits:** `planStep` (reads `plan_titles` and `discovery` artifacts), `reviseDiagnosis` (reads `reports.data` as evidence), the report page's score history (`score_version`), `SCORE_VERSION` bumps, `module_id` backfill rules.
- **Does not hit:** `crawlStep`/`profileStep` (they never read the score); Search Console sync (this reads a snapshot, never fetches).

## Surfaces

| Surface | Role |
|---|---|
| `scoring` step | One `website_auditor` call |
| `reports.data` | Score, versions, which snapshot was used |
| `diagnoses` + findings + items | What the owner reviews |
| `module_runs` | Record of which modules ran |

## See

- Objects: [growth-score](../objects/report/growth-score.md), [report](../objects/report/report.md), [diagnosis](../objects/report/diagnosis.md), [diagnosis-finding](../objects/report/diagnosis-finding.md), [growth-plan-item](../objects/report/growth-plan-item.md), [module-registry](../objects/modules/module-registry.md), [organization-module](../objects/modules/organization-module.md), [module-run](../objects/modules/module-run.md), [search-console-snapshot](../objects/integrations/search-console-snapshot.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Processes: [crawl-and-profile](crawl-and-profile.md), [plan-and-write](plan-and-write.md), [sync-search-console](sync-search-console.md), [run-ai-worker](run-ai-worker.md)
- Source: `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/modules/score.ts`, `web/src/lib/modules/registry.ts`, `web/src/lib/modules/server.ts`
