# Walking the map

Checked against commit `7a91d84` on 2026-10-24. Paths are repo-relative; `web/src/` is shortened to `src/`
inside citations only when the context is unambiguous.

## Universes

Every card carries one `universe:` label. Read the label before trusting the card.

| Universe | Meaning | Rule |
|---|---|---|
| `live` | in force at the cited commit | implement and cite against it |
| `leftover` | still present, no longer the main path | touch only when that path is in scope |
| `ghost` | named in docs, enums or env, but not wired | never implement against it; cite the doc that plans it |

### Live today

Jobs that run: `website_evidence` (crawling, profiling), `website_plan` (scoring, planning, writing), `website_intel`
(all five), `diagnosis_update` (scoring) — `web/src/lib/pipeline/steps.ts:11-22`. Modules with `live: true`:
`business_intel`, `website_seo` (0.35), `conversion` (0.65), `content_studio`, `search_visibility` (Pro, 0.10) —
`web/src/lib/modules/registry.ts:63,75,88,102,114`. Tiers `basic`, `pro`, `premium`, stored plan `trial` for the 14-day
Pro trial — `web/src/lib/plans/tiers.ts:8-12,89-101`. AI workers actually called: `extractor`, `business_analyst`,
`website_auditor`, `content_strategist`, `content_writer`, `app_assistant` (see [ai-worker](objects/pipeline/ai-worker.md)).
Eight member roles with one permission matrix — `web/src/lib/team/roles.ts:8-17,81-102` (see
[member-role](objects/tenancy/member-role.md)).

### Ghost (do not build against)

- n8n: no `web/src/app/api/n8n/*` route, `/api/n8n` not in `PUBLIC_PATHS` (`web/src/proxy.ts:11-22`); the client's
  `triggerWebhook`/`verifyCallback` are never imported (`web/src/lib/integrations/n8n.ts:27,38`); `n8n/` holds only
  `.gitkeep`. Planned in `CLAUDE.md:80-81`.
- Billing and Stripe (`subscriptions` table never written, `supabase/migrations/20261010061028_foundation.sql:263-273`;
  D-039/D-040), CRM (D-048), invitations, seats, a role UI, client approvers (D-046, D-047,
  `docs/decisions/DECISION_LOG.md:583-586`) and the permissions nothing enforces yet (see
  [member-role](objects/tenancy/member-role.md)), publishing (`scheduled`/`published` never set,
  `foundation.sql:177-178`; D-049), email sending (D-033, Q-010), analytics and automation (`SOLUTIONS` marked
  planned, `web/src/lib/onboarding/catalog.ts:35-44`), password reset (MVP PL-5).
- Modules with `live: false` (`registry.ts:129-225`), `coming_soon` features (`tiers.ts:59,63-67`), "Coming soon"
  tools on the connect step (`web/src/lib/integrations/tool-catalog.ts:46-111`), OAuth scopes `read`/`write`
  (`web/src/lib/oauth/scopes.ts:17-18`).
- `AI_MODE=free`: the lineup exists (`web/src/lib/ai/router.ts:12-18`) but OpenRouter's zero-data-retention setting
  refuses every free model (D-037). Unused workers `seo_analyst`, `crm_analyst`, `campaign_planner`, `qa_reviewer`,
  `marketing_assistant` (`router.ts:44-49`).
- Unused tables and functions: `knowledge_chunks` + `match_knowledge()`, `campaigns`, `integrations`, `subscriptions`;
  write-only `brand_profiles`, `knowledge_documents`; never-written `organization_modules` (`registry.ts:259`);
  `ai_jobs.task_class` always `"complex"`, `ai_jobs.n8n_execution_id` unused.

### Leftover (present, not the main path)

- Decision log: D-007, D-008, D-017, D-020, D-026 superseded; D-023 withdrawn; the index table stops at D-028 (plus a
  D-055 row) while entries run to D-055 (`docs/decisions/DECISION_LOG.md:12-42`).
- Pre-ON-8 "five opportunities" copy and fields (`web/src/app/analysis/[id]/report-data.ts:18-26`,
  `report-sections.tsx:230-235`, `web/src/app/login/page.tsx:28`, `start-form.tsx:36`).
- Single-invocation compatibility: unknown worker falls back to the full sequence (`steps.ts:24-27`), old outputs
  handled at `steps.ts:59-60`, `claims.ts:16`, `report-data.ts:210`. Pre-module scores derived by `modulesUsed`
  (`web/src/lib/modules/score.ts:142-144`); `business_profiles.growth_score` duplicates `reports.data.growth_score`.
- Dev-only scripts (`eval:models` calls OpenRouter directly, `audit:site`, `pipeline:local`, `health`), the gitignored
  `web/.eval*` output, thirteen `.claude/worktrees/` from squash-merged PRs.
- Doc statements the code has moved past: D-044 "Built, not live"; D-054 "Search Console isn't used in the diagnosis"
  (D-051 step 6 changed it); `docs/product/MVP_SCOPE.md:150` says the marketing site is not built; "3–4 minutes" in
  `MVP_SCOPE.md:102` and `web/src/lib/assistant/knowledge.ts:162`.

## Name collisions

The product word and the code name differ. Use the code name in code and citations, the product word in copy.

| Product / UI / doc word | Code name | Where |
|---|---|---|
| Braventa | `GrowthOS` (repo, `X-GrowthOS-Secret`, `-- GrowthOS foundation schema`, GCP `growth-os-511206`) | `CLAUDE.md:1`; `web/src/lib/integrations/n8n.ts:31`; `foundation.sql:1`; `docs/architecture/SYSTEM_ARCHITECTURE.md:253` |
| "Analyze website" (new analysis) | job `website_evidence` → steps crawling, profiling | `web/src/lib/onboarding/start.ts:92`; `steps.ts:18` |
| the report after discovery | job `website_plan` → scoring, planning, writing | `web/src/lib/onboarding/orchestrate.ts:33`; `steps.ts:19` |
| "Re-run analysis" | job `website_intel` → all five steps | `web/src/app/analysis/actions.ts:99`; `steps.ts:20` |
| owner corrections to the diagnosis | job `diagnosis_update` → scoring only | `web/src/app/analysis/plan-actions.ts:137`; `steps.ts:21` |
| "Report" / "Growth assessment" | route `/analysis/[id]` where `id` is the `business_profiles` id; row in `reports` with `report_type` `growth_plan` | `web/src/app/analysis/[id]/page.tsx:17`; `report-data.ts:97-101` |
| `worker` (one column name, two vocabularies) | `ai_jobs.worker` = the four job types; `ai_usage.worker` = the AI workers | `foundation.sql:225,243`; `router.ts:40-65` |
| website audit (technical checks) vs AI worker `website_auditor` | checks: `audit_runs`, `audit_findings`, `web/src/lib/audit/checks.ts`; the worker writes the diagnosis and plan | `20261011160802_website_audit.sql:6,35`; `website-intel.ts:450` |
| growth score | `computeGrowthScore`, `SCORE_VERSION = 2`; legacy column `business_profiles.growth_score` | `score.ts:20,133`; `foundation.sql:90` |
| growth plan | `growth_plan_items`; feature `growth_plan`; solution `growth_plan`; `report_type` `growth_plan` | `20261010164133_diagnosis_and_plan.sql:54`; `tiers.ts:52`; `catalog.ts:15` |
| "plan" (three meanings) | growth plan (`web/src/lib/plan/`, `plan-actions.ts`), subscription plan (`web/src/lib/plans/`, `organizations.plan`), 30-day plan (`content_calendars`) | `foundation.sql:13,165` |
| diagnosis / "What's holding the business back" | `diagnoses`, `diagnosis_findings`; feature `diagnosis` also gates module `conversion` | `diagnosis_and_plan.sql:5,32`; `tiers.ts:51`; `registry.ts:87` |
| drafted posts and 30-day plan | one table `content_items`: plan rows `brief`, drafts `needs_approval`; calendar in `content_calendars`; module `content_studio`; feature `content_plan` | `foundation.sql:165,180`; `website-intel.ts:767-830` |
| business profile | `business_profiles` (`intelligence` jsonb); module `business_intel`; feature `website_analysis`; write-only `brand_profiles` | `foundation.sql:77,89,97`; `registry.ts:59`; `tiers.ts:49` |
| "Ask Braventa" | worker `app_assistant`, route `/api/assistant`, `web/src/lib/assistant/*`, table `assistant_usage`, feature `ai_assistant`; `SOLUTIONS.ai_assistant` still says planned (stale) | `router.ts:49`; `tiers.ts:56`; `catalog.ts:45-49` |
| "AI assistant connection" (MCP) vs Ask Braventa | feature `assistant_connection`, route `/api/mcp`; Settings section `#ai-assistant` is MCP | `tiers.ts:58`; `web/src/app/settings/page.tsx:66-69` |
| "Connect your tools" | route `/onboarding/[sessionId]/connect`; no session status of its own (`followUpStep`); catalog `TOOLS` | `web/src/lib/onboarding/steps.ts:28-33`; `tool-catalog.ts:34` |
| "Integrations" | Settings heading = MCP keys, service keys, assistant; live table `integration_connections`; unused `integrations`; folder `web/src/lib/integrations/` = every external client | `settings/page.tsx:60-61`; `20261011161133_search_console.sql:7-10` |
| Search visibility (module) vs "Search performance" (page) | module `search_visibility`, feature `search_console`, tool `search_console`, provider `google_search_console`, table `search_console_snapshots`, prompt ref `G1`, page `/search` | `registry.ts:109-114`; `tiers.ts:62`; `web/src/app/search/page.tsx:10` |
| pain points / discovery | `PAIN_POINTS`, `SOLUTIONS`, `CATALOG_VERSION = 1`; `onboarding_responses.pain_point_id`; solution `website_assessment` = module `website_seo`, `crm_intelligence` = module `crm` | `catalog.ts:10-65,100`; `20261010155911_onboarding_discovery.sql:29` |
| Pro trial | stored plan `trial`, effective tier `pro` until `trial_ends_at`, then `basic`; `TRIAL_DAYS = 14`; `hasSubscription` is not the `subscriptions` table | `tiers.ts:9,12,89-101`; `web/src/lib/plans/subscription.ts:5` |
| Premium / "Custom" | `premium` | `tiers.ts:8,23`; `DECISION_LOG.md:414` |
| workspace / organization / tenant / business | `organizations` (docs: "Tenant"); UI says "business"; `business_profiles` is a separate entity, several per org; "Workspace" only in the ChatGPT instructions | `foundation.sql:9`; `docs/architecture/DATA_MODEL.md:75`; `web/src/app/settings/connect-instructions.tsx:57` |
| Owner, Admin, Marketing manager … Client approver; "member" | enum `member_role`, snake_case ids, labels `ROLE_LABELS`; the old value `member` became `analyst`, so "member" now means anyone with a membership; only `create_organization` assigns a role (`owner`); app checks go through `can()`, while SQL `is_org_admin` still compares role text; `platform_admins` are staff, not a role | `web/src/lib/team/roles.ts:8-30,110-112`; `20261023092945_roles_and_permissions.sql:19-27`; `foundation.sql:45-54,66-67` |

## Reading order

1. This file, for the universe and the vocabulary.
2. `objects/_index.md` or `processes/` for the card you need.
3. The card's `See` link, then the cited lines. Stop there.
