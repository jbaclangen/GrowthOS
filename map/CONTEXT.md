# Walking the map

Checked against commit `1917f9a` on 2026-11-14. Paths are repo-relative; `web/src/` is shortened to `src/`
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
`business_intel`, `website_seo` (0.35), `conversion` (0.65), `content_studio`, `search_visibility` (Pro, 0.10),
`analytics` (Pro, 0.10) — `web/src/lib/modules/registry.ts:64,76,89,103,115,202`. Tiers `basic`, `pro`, `premium`,
stored plan `trial` for the 14-day Pro trial — `web/src/lib/plans/tiers.ts:8-12,97-111`. AI workers actually called:
`extractor`, `business_analyst`, `website_auditor`, `content_strategist`, `content_writer`, `app_assistant` (see
[ai-worker](objects/pipeline/ai-worker.md)). Eight member roles with one permission matrix —
`web/src/lib/team/roles.ts:8-17,83-106` (see [member-role](objects/tenancy/member-role.md)). Team management: Settings →
Team, one-time invite links joined at `/invite/[token]`, seat allowances per plan, role changes and removals —
`web/src/lib/team/seats.ts:15-19`, `web/src/app/settings/team-actions.ts:38,99,131`,
`web/src/app/invite/[token]/actions.ts:17` (see [team-invitation](objects/tenancy/team-invitation.md),
[invite-and-join](processes/invite-and-join.md)). Connected tools, read-only, on Pro and the trial: Google (Search
Console and Google Analytics 4, one sign-in) and HubSpot counts — `web/src/lib/integrations/tool-catalog.ts:37-59,68-85`
(see [integration-connection](objects/integrations/integration-connection.md)). Several businesses per account up to the
plan's limit, one trial per account (D-062) — `web/src/lib/plans/business-limit.ts:12` (see
[switch-business](processes/switch-business.md), [account-trial](objects/tenancy/account-trial.md)); owners remove a
business (D-061) — `web/src/app/settings/remove-business-actions.ts:29` (see [remove-business](processes/remove-business.md)).

### Ghost (do not build against)

- n8n: no `web/src/app/api/n8n/*` route, `/api/n8n` not in `PUBLIC_PATHS` (`web/src/proxy.ts:11-22`); the client's
  `triggerWebhook`/`verifyCallback` are never imported (`web/src/lib/integrations/n8n.ts:27,38`); `n8n/` holds only
  `.gitkeep`. Planned in `CLAUDE.md:89-90`.
- Billing and Stripe (`subscriptions` table never written, `supabase/migrations/20261010061028_foundation.sql:263-273`;
  D-039/D-040); the CRM module (`crm`, `live: false`, `web/src/lib/modules/registry.ts:184-195`; D-060 is Proposed; the
  HubSpot connection itself is live, counts only, see [hubspot-snapshot](objects/integrations/hubspot-snapshot.md));
  invite emails, buying extra seats, client approvers (D-046, D-047, `docs/decisions/DECISION_LOG.md:619-622`) and the
  permissions nothing enforces yet (see [member-role](objects/tenancy/member-role.md)); publishing
  (`scheduled`/`published` never set, `foundation.sql:177-178`; D-049); email sending (D-033, Q-010); performance
  reporting and automation (`SOLUTIONS.analytics`, "Performance reporting", not the live Analytics module, and
  `SOLUTIONS.automation` marked planned, `web/src/lib/onboarding/catalog.ts:35-46`); password reset (MVP PL-5).
- Written, not applied: the owner guard for deletes and the last owner,
  `supabase/migrations/20261114120000_memberships_owner_guard_delete.sql:1-4` (waits for the founder's yes, then a
  rename to the version Supabase assigns; see [membership](objects/tenancy/membership.md)). Until it is applied, the
  guard in force is the insert/update one, `supabase/migrations/20261017030000_mcp_oauth.sql:37-38`.
- Modules with `live: false` (`registry.ts:124-195,210-233`), `coming_soon` features (`tiers.ts:61,72-76`), "Coming
  soon" tools on the connect step (`web/src/lib/integrations/tool-catalog.ts:60-67,86-117`), OAuth scopes `read`/`write`
  (`web/src/lib/oauth/scopes.ts:17-18`).
- `AI_MODE=free`: the lineup exists (`web/src/lib/ai/router.ts:12-18`) but OpenRouter's zero-data-retention setting
  refuses every free model (D-037). Unused workers `seo_analyst`, `crm_analyst`, `campaign_planner`, `qa_reviewer`,
  `marketing_assistant` (`router.ts:44-49`).
- Unused tables and functions: `knowledge_chunks` + `match_knowledge()`, `campaigns`, `integrations`, `subscriptions`;
  write-only `brand_profiles`, `knowledge_documents`; never-written `organization_modules` (`registry.ts:260-265`);
  `ai_jobs.task_class` always `"complex"`, `ai_jobs.n8n_execution_id` unused.

### Leftover (present, not the main path)

- Decision log: D-007, D-008, D-017, D-020, D-026 and D-045 superseded; D-023 withdrawn
  (`docs/decisions/DECISION_LOG.md:13-76`, the index, which now lists every entry through D-062).
- Pre-ON-8 "five opportunities" fields and their report section (`web/src/app/analysis/[id]/report-data.ts:18-26,37-38`,
  `report-sections.tsx:236-241`); the sign-in and start-form copy no longer mentions them.
- Single-invocation compatibility: unknown worker falls back to the full sequence (`steps.ts:24-27`), old outputs
  handled at `steps.ts:59-60`, `web/src/lib/pipeline/claims.ts:16`, `report-data.ts:210-212`. Pre-module scores derived
  by `modulesUsed` (`web/src/lib/modules/score.ts:180-185`); `business_profiles.growth_score` duplicates
  `reports.data.growth_score`.
- Dev-only scripts (`eval:models` calls OpenRouter directly, `audit:site`, `pipeline:local`, `health`), the gitignored
  `web/.eval*` output (`web/.gitignore:44-46`), and local checkouts under `.claude/worktrees/` left by merged PRs (not in
  git).
- Doc statements the code has moved past: D-044 "Built, not live" (`docs/decisions/DECISION_LOG.md:573`); D-054 "Its
  data still isn't used in the diagnosis" (`DECISION_LOG.md:767`; D-051 step 6 changed it); D-046 "Remains" still lists
  more than one business per account (`DECISION_LOG.md:619`; D-062 built it);
  `docs/product/MVP_SCOPE.md:159` says the marketing site is not built; "3–4 minutes" in `MVP_SCOPE.md:103` and
  `web/src/lib/assistant/knowledge.ts:171,194`.

## Name collisions

The product word and the code name differ. Use the code name in code and citations, the product word in copy.

| Product / UI / doc word | Code name | Where |
|---|---|---|
| Braventa | `GrowthOS` (repo, `X-GrowthOS-Secret`, `-- GrowthOS foundation schema`, GCP `growth-os-511206`) | `CLAUDE.md:1`; `web/src/lib/integrations/n8n.ts:31`; `foundation.sql:1`; `docs/architecture/SYSTEM_ARCHITECTURE.md:257` |
| "Analyze website" (new analysis) | job `website_evidence` → steps crawling, profiling | `web/src/lib/onboarding/start.ts:92`; `steps.ts:18` |
| the report after discovery | job `website_plan` → scoring, planning, writing | `web/src/lib/onboarding/orchestrate.ts:33`; `steps.ts:19` |
| "Re-run analysis" | job `website_intel` → all five steps | `web/src/app/analysis/actions.ts:115`; `steps.ts:20` |
| owner corrections to the diagnosis | job `diagnosis_update` → scoring only | `web/src/app/analysis/plan-actions.ts:137`; `steps.ts:21` |
| "Report" / "Growth assessment" | route `/analysis/[id]` where `id` is the `business_profiles` id; row in `reports` with `report_type` `growth_plan` | `web/src/app/analysis/[id]/page.tsx:17`; `report-data.ts:97-103` |
| `worker` (one column name, two vocabularies) | `ai_jobs.worker` = the four job types; `ai_usage.worker` = the AI workers | `foundation.sql:225,243`; `router.ts:40-65` |
| website audit (technical checks) vs AI worker `website_auditor` | checks: `audit_runs`, `audit_findings`, `web/src/lib/audit/checks.ts`; the worker writes the diagnosis and plan | `20261011160802_website_audit.sql:6,35`; `website-intel.ts:460` |
| growth score | `computeGrowthScore`, `SCORE_VERSION = 3`; legacy column `business_profiles.growth_score` | `score.ts:22,171`; `foundation.sql:90` |
| growth plan | `growth_plan_items`; feature `growth_plan`; solution `growth_plan`; `report_type` `growth_plan` | `20261010164133_diagnosis_and_plan.sql:54`; `tiers.ts:54`; `catalog.ts:15` |
| "plan" (three meanings) | growth plan (`web/src/lib/plan/`, `plan-actions.ts`), subscription plan (`web/src/lib/plans/`, `organizations.plan`), 30-day plan (`content_calendars`) | `foundation.sql:13,165` |
| diagnosis / "What's holding the business back" | `diagnoses`, `diagnosis_findings`; feature `diagnosis` also gates module `conversion` | `diagnosis_and_plan.sql:5,32`; `tiers.ts:53`; `registry.ts:88` |
| drafted posts and 30-day plan | one table `content_items`: plan rows `brief`, drafts `needs_approval`; calendar in `content_calendars`; module `content_studio`; feature `content_plan` | `foundation.sql:165,180`; `website-intel.ts:791-815,857-867` |
| business profile | `business_profiles` (`intelligence` jsonb); module `business_intel`; feature `website_analysis`; write-only `brand_profiles` | `foundation.sql:77,89,97`; `registry.ts:59`; `tiers.ts:51` |
| "Ask Braventa" | worker `app_assistant`, route `/api/assistant`, `web/src/lib/assistant/*`, table `assistant_usage`, feature `ai_assistant`; solution `ai_assistant` ("AI assistant (Ask Braventa)", available, also names the MCP connection) | `router.ts:52`; `tiers.ts:58`; `web/src/lib/onboarding/catalog.ts:48-53` |
| "AI assistant connection" (MCP) vs Ask Braventa | feature `assistant_connection`, route `/api/mcp`; Settings section `#ai-assistant` is MCP | `tiers.ts:60`; `web/src/app/settings/page.tsx:78-82` |
| "Connect your tools" | route `/onboarding/[sessionId]/connect`; no session status of its own (`followUpStep`); catalog `TOOLS` | `web/src/lib/onboarding/steps.ts:28-33`; `tool-catalog.ts:36` |
| "Integrations" | Settings heading `#integrations` = the MCP connection, connected apps, service keys and the Connections cards (Google, HubSpot); live table `integration_connections`; unused `integrations`; folder `web/src/lib/integrations/` = every external client | `settings/page.tsx:72-73,78,161-163`; `20261011161133_search_console.sql:7-10` |
| Search visibility (module) vs "Search performance" (page) | module `search_visibility`, feature `search_console`, tool `search_console`, provider `google_search_console`, table `search_console_snapshots`, prompt ref `G1`, page `/search` | `registry.ts:110-115,283`; `tiers.ts:64`; `web/src/app/search/page.tsx:10` |
| pain points / discovery | `PAIN_POINTS`, `SOLUTIONS`, `CATALOG_VERSION = 2`; `onboarding_responses.pain_point_id`; solution `website_assessment` = module `website_seo`, `crm_intelligence` = module `crm` | `web/src/lib/onboarding/catalog.ts:10-69,104`; `20261010155911_onboarding_discovery.sql:29` |
| Pro trial | stored plan `trial`, effective tier `pro` until `trial_ends_at`, then `basic`; `TRIAL_DAYS = 14`; `hasSubscription` is not the `subscriptions` table | `tiers.ts:9,12,97-111`; `web/src/lib/plans/subscription.ts:5` |
| Premium / "Custom" | `premium` | `tiers.ts:8,23`; `DECISION_LOG.md:448` |
| workspace / organization / tenant / business | `organizations` (docs: "Tenant"); UI says "business"; one account may own several (D-062), the current one is the `brv_business` cookie; `business_profiles` is a separate entity, several per org (the dashboard calls them websites); "Workspace" only in the ChatGPT instructions | `foundation.sql:9`; `docs/architecture/DATA_MODEL.md:84`; `web/src/lib/organizations/current.ts:10`; `web/src/app/dashboard/page.tsx:92`; `web/src/app/settings/connect-instructions.tsx:57` |
| Owner, Admin, Marketing manager … Client approver; "member" | enum `member_role`, snake_case ids, labels `ROLE_LABELS`; the old value `member` became `analyst`, so "member" now means anyone with a membership; `create_organization` assigns `owner`, and only invites and Settings → Team give other roles (secret key); app checks go through `can()`, while SQL `is_org_admin` still compares role text; `platform_admins` are staff, not a role | `web/src/lib/team/roles.ts:8-30,114-116`; `20261023092945_roles_and_permissions.sql:19-27`; `foundation.sql:45-54,66-67`; `web/src/app/invite/[token]/actions.ts:51-53`; `web/src/app/settings/team-actions.ts:116` |
| "Team" (Settings section, `#team`) vs `team.manage` vs `team_events` vs "members" | the section is shown to every member; `team.manage` (owner, admin) only unlocks its controls; `team_events` is the audit log of invites, joins, role changes and removals, not an event bus; `team_invitations` rows are invites, not members; a "full seat" is any role except analyst and client approver | `web/src/app/settings/team-section.tsx:10-16,24`; `web/src/lib/team/roles.ts:86,128-133`; `supabase/migrations/20261107154953_team_invitations.sql:15,43-47`; `web/src/lib/team/seats.ts:23-32` |

## Reading order

1. This file, for the universe and the vocabulary.
2. `objects/_index.md` or `processes/` for the card you need.
3. The card's `See` link, then the cited lines. Stop there.
