---
type: object
cluster: modules
universe: live
status: verified
verified: 2026-11-08
commit: 00d230f
entity: web/src/lib/modules/registry.ts
---

# Feature module registry (`registry.ts` / `module_id`)

The one list of the fourteen feature modules — their tier, whether they are live, their growth-score weight and how findings and plan items map onto them — mirrored by the `module_id` SQL domain.

## Why this shape

D-051 made modules the unit the growth score and the tier map are expressed in, without changing any result an owner sees: five modules are live (four Basic plus Search visibility on Pro), the rest stay "coming soon" until the PR that ships one sets `live` (`web/src/lib/modules/registry.ts:4-13`). The database domain holds the same ids so no column can name a module that does not exist; a test checks the two lists agree (`supabase/migrations/20261023063253_feature_modules.sql:5-7,25-27`, `web/src/lib/modules/migration.test.ts`).

## Shape

- `ModuleId`: `business_intel`, `website_seo`, `conversion`, `content_studio`, `search_visibility`, `local_seo`, `social`, `search_ads`, `email`, `video`, `crm`, `analytics`, `automation`, `custom_integrations` — `web/src/lib/modules/registry.ts:15-29`; `ModuleDef` fields (`tier`, `featureId`, `live`, `scoreWeight`, `subScore`, `findingCategories`, `planAreas`) — `:31-53`.
- Live: `business_intel` `:58-63`, `website_seo` weight 0.35 `:70-77`, `conversion` 0.65 `:83-91`, `content_studio` `:97-102` (Basic); `search_visibility` 0.1, Pro `:109-118`. Not live: `:124-230` (Premium only `custom_integrations` `:220-225`).
- `MODULE_IDS` `:233`; `liveModules` `:249-251`; `enabledModuleIds(tier, overrides)` `:263-266`; `moduleForArea` `:272-276`; `SEARCH_CONSOLE_REF = "G1"` `:280`; `moduleForFinding` (verified citing G1 → search visibility, other verified → website SEO, customer-provided → business intel, inferred → none) `:286-295`; `moduleFeature` `:298-300`.
- SQL domain `public.module_id` — `supabase/migrations/20261023063253_feature_modules.sql:25-27`; backfill rules for existing findings and plan items `:86-103`.
- Score over modules: `SCORE_VERSION = 2` `web/src/lib/modules/score.ts:20`; `computeGrowthScore(evidence, enabled)` `:133-140`; used in the scoring step `web/src/lib/pipeline/website-intel.ts:626-633`; `scoreBlend(modules, form)` words the blend from the modules used (`BLEND` `web/src/lib/modules/score.ts:165-169`, `:171-174`). The report's score tile says "Based on N modules" from `reports.data.score_modules` plus the short blend, and shows a Search visibility bar from `reports.data.module_scores` when that module counted — `web/src/app/analysis/[id]/report-data.ts:31-33`, `web/src/app/analysis/[id]/infographic.tsx:168-171,183,205-209`; the Scores section does the same with the long blend — `web/src/app/analysis/[id]/report-sections.tsx:54-56,61,77`; Ask Braventa's business summary gets the module labels and that sub-score — `web/src/lib/assistant/context.ts:159,177,180`.

Citations: `web/src/lib/modules/registry.ts:4-13,15-53,58-118,124-230,233-300`; `supabase/migrations/20261023063253_feature_modules.sql:5-7,25-27,86-103`; `web/src/lib/modules/score.ts:20,133-140,149-160,162-174`; `web/src/lib/pipeline/website-intel.ts:526,533,586,626-633`; `web/src/app/analysis/[id]/infographic.tsx:168-171,173-184,205-209`; `web/src/app/analysis/[id]/report-sections.tsx:54-56,61,64-77`; `web/src/lib/assistant/context.ts:159,177,180`

## Connected to

- **owns:** nothing (code)
- **owned-by:** none
- **joins:** [plan-tier](../tenancy/plan-tier.md) (`tier`, `featureId` → `FEATURES`); [organization-module](organization-module.md) (overrides fed to `enabledModuleIds`); [module-run](module-run.md) (`module_id`); [diagnosis-finding](../report/diagnosis-finding.md) and [growth-plan-item](../report/growth-plan-item.md) (`module_id` via `moduleForFinding`/`moduleForArea`); [search-console-snapshot](../integrations/search-console-snapshot.md) (Search visibility's evidence)
- **looks-like-but-is-not:** [discovery-catalog](../onboarding/discovery-catalog.md) solutions — what the plan can point an owner at, not scored capability areas

## If you change this

- **Hits:** the `module_id` domain (a new id needs a migration replacing the constraint, `supabase/migrations/20261023063253_feature_modules.sql:27`); `migration.test.ts` and `registry.test.ts`; `SCORE_VERSION` if a weight or part moves (`web/src/lib/modules/score.ts:16-19`); `enabledModules`; `moduleForFinding`/`moduleForArea` and so every new finding and plan item; the module names on the report's score tile, in the MCP status note and in Ask Braventa's business summary (`moduleLabel` `web/src/lib/modules/registry.ts:245-247`); a newly scored module needs a `SCORE_SOURCES` entry (`web/src/lib/modules/score.ts:149-154`), a `BLEND` entry for the tile's and Scores section's blend wording (`:165-169`) and its own bar, since each bar is written by hand (`web/src/app/analysis/[id]/infographic.tsx:173-184`, `web/src/app/analysis/[id]/report-sections.tsx:64-77`; the assistant summary carries only Search visibility's sub-score, `web/src/lib/assistant/context.ts:180`); `docs/architecture/FEATURE_MODULES.md`.
- **Does not hit:** [plan-tier](../tenancy/plan-tier.md)'s `FEATURES` list — a module's `live` flag does not flip a feature's status (the test only requires they agree, `web/src/lib/modules/registry.ts:38-39`).

Ghost: a module switch in the app and the permission that would gate it (the D-046 roles foundation has no module permission yet, [member-role](../tenancy/member-role.md)) — `docs/architecture/FEATURE_MODULES.md:128`, `docs/architecture/ROLES_AND_PERMISSIONS.md:161`; per-module report sections, `audit_findings.module_id`, prompt fragments — `docs/decisions/DECISION_LOG.md:682-685`.

## Surfaces

| Surface | Role |
|---|---|
| Scoring step (`web/src/lib/pipeline/website-intel.ts:626-633`) | reads (`enabledModules`, `computeGrowthScore`) |
| Diagnosis update (`web/src/lib/pipeline/website-intel.ts:586`) | reads (`enabledModules`) |
| `storeDiagnosis` (`web/src/lib/pipeline/website-intel.ts:526,533`) | reads (`moduleForFinding`, `moduleForArea`) |
| Report score tile (`web/src/app/analysis/[id]/infographic.tsx:168-171,205-209`) | reads (`moduleLabel`, `modulesUsed`, `scoreBlend`) |
| Report Scores section (`web/src/app/analysis/[id]/report-sections.tsx:54-56`) | reads (`modulesUsed`, `scoreBlend`) |
| Ask Braventa business summary (`web/src/lib/assistant/context.ts:159,177`) | reads (`modulesUsed`, `moduleLabel`) |
| MCP `braventa_get_status` note (`growthScoreNote` `web/src/lib/modules/score.ts:157-160`, returned at `web/src/lib/mcp/tools.ts:448`) | reads (`moduleLabel`) |
| Owner / Settings | none (no switch UI) |

## See

- Source: `web/src/lib/modules/registry.ts`
- As built: `docs/architecture/FEATURE_MODULES.md`
