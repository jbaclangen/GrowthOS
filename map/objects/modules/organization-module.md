---
type: object
cluster: modules
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261023063253_feature_modules.sql
---

# Module override (`organization_modules`)

A per-organization switch (`enabled`, `config`) over a feature module, read by the scoring step; nothing writes rows yet, so every organization has every live module its tier includes.

## Why this shape

D-051 wanted the growth score to be computable over "the organization's enabled modules" from day one, but who may switch a module off is a roles question (D-046), so the table exists with members reading and only the server allowed to write (`supabase/migrations/20261023063253_feature_modules.sql:8-11`). An override can only drop a module: it cannot switch on one the tier excludes or that is not live (`:32-33`, `web/src/lib/modules/registry.ts:257-262`).

## Shape

- PK (`organization_id`, `module_id` domain), `enabled` default true, `config` jsonb, timestamps — `supabase/migrations/20261023063253_feature_modules.sql:29-39`.
- RLS "members read"; insert/update/delete revoked from clients — `supabase/migrations/20261023063253_feature_modules.sql:71-76`; `touch_updated_at` `:78-79`.
- The one reader: `enabledModules` reads the tier and the overrides with the admin client and throws if either read fails (a failed read fails the scoring step) — `web/src/lib/modules/server.ts:11-19`; the rule is `enabledModuleIds` — `web/src/lib/modules/registry.ts:263-266`; called before the diagnosis model call — `web/src/lib/pipeline/website-intel.ts:622-626`.
- No writer in the repo: `supabase/migrations/20261023063253_feature_modules.sql:9,105`; `docs/architecture/DATA_MODEL.md:95`; `docs/architecture/FEATURE_MODULES.md:45-48`.
- Effect of a row with `enabled = false`: the module leaves the score and (for Search visibility) its summary leaves the diagnosis; the analysis steps still run — `web/src/lib/modules/registry.ts:260-262`, `docs/architecture/FEATURE_MODULES.md:46-48`.

Citations: `supabase/migrations/20261023063253_feature_modules.sql:8-11,29-39,71-79,105`; `web/src/lib/modules/server.ts:11-19`; `web/src/lib/modules/registry.ts:257-266`; `web/src/lib/pipeline/website-intel.ts:622-626`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** [module-registry](module-registry.md) (`module_id`, `enabledModuleIds`); [plan-tier](../tenancy/plan-tier.md) (the tier the override is applied on top of)
- **looks-like-but-is-not:** [module-run](module-run.md) — a record of what ran, not a setting; `plan`/`trial_ends_at` on the organization — the tier itself, which this never changes

## If you change this

- **Hits:** `enabledModules` (its failure fails the scoring step), `enabledModuleIds`, the growth score and whether the Search Console summary reaches the diagnosis; `docs/architecture/DATA_MODEL.md:95`, `docs/architecture/FEATURE_MODULES.md` §3.
- **Does not hit:** [module-run](module-run.md) rows — the profiling and writing steps record their modules regardless of overrides; the `website_evidence` steps, which do not read overrides.

Ghost: the switch UI and the role allowed to use it — `docs/architecture/FEATURE_MODULES.md:125`, `docs/decisions/DECISION_LOG.md:568-582` (D-046).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step via `enabledModules` (`web/src/lib/modules/server.ts:14`) | reads |
| App pages, Settings, MCP | none |
| Server (service role) | may write; no code path does yet |

## See

- Source: `supabase/migrations/20261023063253_feature_modules.sql`
- As built: `docs/architecture/FEATURE_MODULES.md`
