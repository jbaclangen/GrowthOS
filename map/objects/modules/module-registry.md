---
type: object
cluster: modules
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: web/src/lib/modules/registry.ts
---

# Feature module registry (`registry.ts` / `module_id`)

The one list of the fourteen feature modules — their tier, whether they are live, their growth-score weight and how findings and plan items map onto them — mirrored by the `module_id` SQL domain.

## Why this shape

D-051 made modules the unit the growth score and the tier map are expressed in, without changing any result an owner sees: six modules are live (four Basic plus Search visibility and Analytics on Pro), the rest stay "coming soon" until the PR that ships one sets `live` (`web/src/lib/modules/registry.ts:4-14`). The database domain holds the same ids so no column can name a module that does not exist; a test checks the two lists agree (`supabase/migrations/20261023063253_feature_modules.sql:5-7,25-27`, `web/src/lib/modules/migration.test.ts`).

## Shape

- `ModuleId`: `business_intel`, `website_seo`, `conversion`, `content_studio`, `search_visibility`, `local_seo`, `social`, `search_ads`, `email`, `video`, `crm`, `analytics`, `automation`, `custom_integrations` — `web/src/lib/modules/registry.ts:16-30`; `ModuleDef` fields (`tier`, `featureId`, `live`, `scoreWeight`, `subScore`, `findingCategories`, `planAreas`) — `:32-54`.
- Live: `business_intel` `web/src/lib/modules/registry.ts:59-64`, `website_seo` weight 0.35 `:71-78`, `conversion` 0.65 `:84-92`, `content_studio` `:98-103` (Basic); `search_visibility` 0.1, Pro `:110-119`; `analytics` 0.1, Pro, feature `google_analytics` `:196-209`. Not live: `:124-195`, `:210-233` (Premium only `custom_integrations` `:222-233`).
- `MODULE_IDS` `web/src/lib/modules/registry.ts:236`; `liveModules` `:252-254`; `enabledModuleIds(tier, overrides)` `:266-269`; `moduleForArea` `:275-279`; `SEARCH_CONSOLE_REF = "G1"` `:283`; `ANALYTICS_REF = "G2"` `:285`; `moduleForFinding` (verified citing G2 → analytics, else citing G1 → search visibility, other verified → website SEO, customer-provided → business intel, inferred → none) `:291-301`; `moduleFeature` `:304-306`.
- SQL domain `public.module_id` — `supabase/migrations/20261023063253_feature_modules.sql:25-27`; backfill rules for existing findings and plan items `:86-103`.
- Score over modules: `SCORE_VERSION = 3` `web/src/lib/modules/score.ts:22`; `computeGrowthScore(evidence, enabled)` `:171-178`; used in the scoring step `web/src/lib/pipeline/website-intel.ts:639-646`; `scoreBlend(modules, form)` words the blend from the modules used (`BLEND` `web/src/lib/modules/score.ts:205-210`, `:212-215`; Analytics adds "your website analytics" `:209`). The report's score tile says "Based on N modules" from `reports.data.score_modules` plus the short blend, and shows a Search visibility bar and an Analytics bar from `reports.data.module_scores` when those modules counted — `web/src/app/analysis/[id]/report-data.ts:31-33`, `web/src/app/analysis/[id]/infographic.tsx:168-173,185-186,208-212`; the Scores section does the same with the long blend — `web/src/app/analysis/[id]/report-sections.tsx:54-57,62,78-79`; Ask Braventa's business summary gets the module labels and both sub-scores — `web/src/lib/assistant/context.ts:165,183,186-187`, printed at `web/src/lib/assistant/prompt.ts:151,158-159`.

Citations: `web/src/lib/modules/registry.ts:4-14,16-54,59-119,124-233,236-306`; `supabase/migrations/20261023063253_feature_modules.sql:5-7,25-27,86-103`; `web/src/lib/modules/score.ts:22,171-178,187-199,201-215`; `web/src/lib/pipeline/website-intel.ts:537,544,597,639-646`; `web/src/app/analysis/[id]/infographic.tsx:168-173,175-187,208-212`; `web/src/app/analysis/[id]/report-sections.tsx:54-57,62,65-79`; `web/src/lib/assistant/context.ts:165,183,186-187`

## Connected to

- **owns:** nothing (code)
- **owned-by:** none
- **joins:** [plan-tier](../tenancy/plan-tier.md) (`tier`, `featureId` → `FEATURES`); [organization-module](organization-module.md) (overrides fed to `enabledModuleIds`); [module-run](module-run.md) (`module_id`); [diagnosis-finding](../report/diagnosis-finding.md) and [growth-plan-item](../report/growth-plan-item.md) (`module_id` via `moduleForFinding`/`moduleForArea`); [search-console-snapshot](../integrations/search-console-snapshot.md) (Search visibility's evidence); [analytics-snapshot](../integrations/analytics-snapshot.md) (Analytics' evidence)
- **looks-like-but-is-not:** [discovery-catalog](../onboarding/discovery-catalog.md) solutions — what the plan can point an owner at, not scored capability areas

## If you change this

- **Hits:** the `module_id` domain (a new id needs a migration replacing the constraint, `supabase/migrations/20261023063253_feature_modules.sql:27`); `migration.test.ts` and `registry.test.ts`; `SCORE_VERSION` if a weight or part moves (`web/src/lib/modules/score.ts:17-21`); `enabledModules`; `moduleForFinding`/`moduleForArea` and so every new finding and plan item; the module names on the report's score tile, in the MCP status note and in Ask Braventa's business summary (`moduleLabel` `web/src/lib/modules/registry.ts:248-250`); a newly scored module needs a `SCORE_SOURCES` entry (`web/src/lib/modules/score.ts:188-193`), a `BLEND` entry for the tile's and Scores section's blend wording (`:205-210`), its own bar, since each bar is written by hand (Search visibility and Analytics have one each, `web/src/app/analysis/[id]/infographic.tsx:175-187`, `web/src/app/analysis/[id]/report-sections.tsx:65-79`), and its own sub-score line in the assistant summary (`web/src/lib/assistant/context.ts:186-187`, `web/src/lib/assistant/prompt.ts:158-159`); `docs/architecture/FEATURE_MODULES.md` (its §4 UI bullet and §8 still say Analytics has no bar and no assistant summary, `:79-80`, `:138`; the code has both).
- **Does not hit:** [plan-tier](../tenancy/plan-tier.md)'s `FEATURES` list — a module's `live` flag does not flip a feature's status (the test only requires they agree, `web/src/lib/modules/registry.ts:39-40`).

Ghost: a module switch in the app and the permission that would gate it (the D-046 roles foundation has no module permission yet, [member-role](../tenancy/member-role.md)) — `docs/architecture/FEATURE_MODULES.md:133`, `docs/architecture/ROLES_AND_PERMISSIONS.md:172`; per-module report sections, `audit_findings.module_id`, prompt fragments — `docs/decisions/DECISION_LOG.md:718-721`; CRM intelligence fed by HubSpot counts (D-060, proposed, not approved; `crm` stays `live: false`, `web/src/lib/modules/registry.ts:184-195`, and nothing reads [hubspot-snapshot](../integrations/hubspot-snapshot.md) rows into the diagnosis) — `docs/architecture/FEATURE_MODULES.md:265-270`, `docs/decisions/DECISION_LOG.md:919-922`.

## Surfaces

| Surface | Role |
|---|---|
| Scoring step (`web/src/lib/pipeline/website-intel.ts:639-646`) | reads (`enabledModules`, `computeGrowthScore`) |
| Diagnosis update (`web/src/lib/pipeline/website-intel.ts:597`) | reads (`enabledModules`) |
| `storeDiagnosis` (`web/src/lib/pipeline/website-intel.ts:537,544`) | reads (`moduleForFinding`, `moduleForArea`) |
| Report score tile (`web/src/app/analysis/[id]/infographic.tsx:168-173,208-212`) | reads (`moduleLabel`, `modulesUsed`, `scoreBlend`) |
| Report Scores section (`web/src/app/analysis/[id]/report-sections.tsx:54-57`) | reads (`modulesUsed`, `scoreBlend`) |
| Ask Braventa business summary (`web/src/lib/assistant/context.ts:165,183`) | reads (`modulesUsed`, `moduleLabel`) |
| MCP `braventa_get_status` note (`growthScoreNote` `web/src/lib/modules/score.ts:196-199`, returned at `web/src/lib/mcp/tools.ts:448`) | reads (`moduleLabel`) |
| Owner / Settings | none (no switch UI) |

## See

- Source: `web/src/lib/modules/registry.ts`
- As built: `docs/architecture/FEATURE_MODULES.md`
