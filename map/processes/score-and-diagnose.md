---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 00d230f
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

1. Evidence: `website_plan` reads the evidence job's output; missing → throw — `web/src/lib/pipeline/website-intel.ts:606-618`.
2. `loadIntel` parses `business_profiles.intelligence` — `web/src/lib/pipeline/website-intel.ts:619`, `:362-372`.
3. `loadDiscovery`: the plan's own session, or (re-run, no session id) the latest `completed` one; anything else → null — `web/src/lib/pipeline/website-intel.ts:621`, `:375-388`.
4. `enabledModules` (tier + `organization_modules` overrides; throws on read failure) — `web/src/lib/pipeline/website-intel.ts:626`; `web/src/lib/modules/server.ts:11-19`; `enabledModuleIds` `web/src/lib/modules/registry.ts:263-266`.
5. Search Console summary only if `search_visibility` is enabled — `web/src/lib/pipeline/website-intel.ts:627`, `:434-436`; `searchConsoleSummaryForPrompt` `web/src/lib/integrations/search-console.ts:575-583`.
6. `diagnose`: `website_auditor` with `diagnosisPrompt` — `web/src/lib/pipeline/website-intel.ts:628`, `:439-472`; prompt at `web/src/lib/pipeline/prompts.ts:266`.
7. `computeGrowthScore(scoreEvidence(...), enabled)`; null → throw — `web/src/lib/pipeline/website-intel.ts:629-634`; `web/src/lib/modules/score.ts:97`, `:133-140`, `SCORE_VERSION` `:20`.
8. Update `business_profiles.growth_score` and `analyzed_at` — `web/src/lib/pipeline/website-intel.ts:636-640`.
9. Insert `reports` with `data.{score_version, score_modules, module_scores, search_console, ...}` — `web/src/lib/pipeline/website-intel.ts:642-675` (`search_console` at `:665-667`).
10. `storeDiagnosis`: insert `diagnoses` — `web/src/lib/pipeline/website-intel.ts:677`, `:484-520`; findings with `moduleForFinding`, items with `moduleForArea` — `:524-537`; rules at `web/src/lib/modules/registry.ts:286-295`, `:272-276`.
11. `module_runs` for `conversion` and, when enabled, `search_visibility` — `web/src/lib/pipeline/website-intel.ts:682-712`.
12. Artifacts for the next step: `report_id`, `growth_score`, `plan_titles`, `discovery` — `web/src/lib/pipeline/website-intel.ts:714-722`.

## Human gate

None here. The output waits for the owner in [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md) and [revise-diagnosis](revise-diagnosis.md).

## If you change this

- **Hits:** `planStep` (reads `plan_titles` and `discovery` artifacts), `reviseDiagnosis` (reads `reports.data` as evidence), the report page's score history (`score_version`), `SCORE_VERSION` bumps, `module_id` backfill rules.
- **Readers of `score_modules`/`module_scores`** (via `modulesUsed`, `web/src/lib/modules/score.ts:144-147`): the score tile and Scores section word the blend with `scoreBlend` and show `module_scores.search_visibility` only when it counted — `web/src/app/analysis/[id]/infographic.tsx:168-171`, `web/src/app/analysis/[id]/report-sections.tsx:54-56`; Ask Braventa's summary — `web/src/lib/assistant/context.ts:159`, `:177`, `:180`; MCP status note — `web/src/lib/mcp/tools.ts:448`.
- **New scored module:** add it to `BLEND` (`web/src/lib/modules/score.ts:165-169`, used by `scoreBlend` `:171-174`) and `SCORE_SOURCES` (`:150-154`), or the tile, Scores section and MCP note won't name it.
- **Does not hit:** `crawlStep`/`profileStep` (they never read the score); Search Console sync (this reads a snapshot, never fetches).

## Surfaces

| Surface | Role |
|---|---|
| `scoring` step | One `website_auditor` call |
| `reports.data` | Score, version, modules used and their sub-scores, which snapshot was used |
| `diagnoses` + findings + items | What the owner reviews |
| `module_runs` | Record of which modules ran |

## See

- Objects: [growth-score](../objects/report/growth-score.md), [report](../objects/report/report.md), [diagnosis](../objects/report/diagnosis.md), [diagnosis-finding](../objects/report/diagnosis-finding.md), [growth-plan-item](../objects/report/growth-plan-item.md), [module-registry](../objects/modules/module-registry.md), [organization-module](../objects/modules/organization-module.md), [module-run](../objects/modules/module-run.md), [search-console-snapshot](../objects/integrations/search-console-snapshot.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Processes: [crawl-and-profile](crawl-and-profile.md), [plan-and-write](plan-and-write.md), [sync-search-console](sync-search-console.md), [run-ai-worker](run-ai-worker.md)
- Source: `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/modules/score.ts`, `web/src/lib/modules/registry.ts`, `web/src/lib/modules/server.ts`
