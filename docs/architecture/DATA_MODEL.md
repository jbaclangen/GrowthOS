# Data model

This document catalogues every table, enum, view and function defined in `supabase/migrations/`, what each
is for, its key columns, how Row Level Security protects it, and whether current application code
(`web/src/`) actually uses it. It also sets the rules for adding new tables. Supabase is Braventa's system
of record (see [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)); security implications are expanded in
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).

**Status / last reviewed: 2026-10-10** (migrations `20261010061028_foundation.sql`,
`20261010061126_advisor_fixes.sql`, `20261010121043_content_approval_guard.sql`).

---

## 1. Migrations

| File | Contents |
|---|---|
| `20261010061028_foundation.sql` | `vector` extension, all tables, enums, helper functions, RLS policies, `updated_at` triggers, `ai_spend_mtd` view |
| `20261010061126_advisor_fixes.sql` | Revokes `is_member` / `is_org_admin` from `anon`; splits the memberships admin policy by action; adds FK indexes |
| `20261010121043_content_approval_guard.sql` | Trigger `guard_content_item_write` on `content_items`: limits client status changes and sets `approved_by` / `approved_at` (D-018) |
| `20261010150627_business_profile_owner_inputs.sql` | Adds `business_profiles.service_area` (text) and `current_tools` (text[]), length checks on `goals`/`service_area` and at most 15 tools, and column comments marking all three as Customer-provided (BI-12) |
| `20261010155623_ai_usage_latency_and_failures.sql` | Adds `ai_usage.latency_ms`, `status` (`ok`/`error`, default `ok`) and `error` (≤ 500 chars) so failed calls and latency are recorded per call |
| `20261010155911_onboarding_discovery.sql` | Unique (`id`, `organization_id`) on `business_profiles`; tables `onboarding_sessions` and `onboarding_responses` with RLS "members all", same-organization composite FKs, one row per pain point per session and one per priority rank (ON-1–ON-4, D-028) |
| `20261010155931_onboarding_sessions_column_grants.sql` | Users may insert only `organization_id`, `business_profile_id`, `created_by`, `status`, `catalog_version` and update only `status`, `completed_at` on `onboarding_sessions`; the job links are written by server code with the admin client |
| `20261010163029_onboarding_follow_ups.sql` | Adds session status `following_up`; table `onboarding_follow_ups` (one row per question asked: pain point, question-bank key, round, `pending`/`answered`/`skipped`/`not_applicable`, answer ≤ 500) with RLS "members all" and a same-organization composite FK (ON-5) |
| `20261011070631_contact_rate_limit.sql` | `contact_requests.ip_hash` (salted HMAC of the visitor IP; insert grant) and a security-definer `before insert` trigger: at most 3 requests per visitor per hour and 5 per email per day (`rate_limited`) (Q-033) |
| `20261011055323_contact_requests.sql` | Table `contact_requests` for the braventa.io contact form: insert-only for anonymous visitors (form columns only), no reads; read in the dashboard. Not a tenant table (D-033) |
| `20261011042846_plan_tiers_and_trial.sql` | `organizations.plan` checked to `trial`/`basic`/`pro`/`premium`; `organizations.trial_ends_at` (default now + 14 days); owners may update only `name` and `slug` (fixes owners being able to change their own plan and AI budget); table `upgrade_requests` (D-030) |
| `20261011140425_mcp_access.sql` | Tables `mcp_access_keys` and `mcp_tool_calls` (D-036); `upgrade_requests.tier` also allows `basic` |
| `20261017020224_assistant_usage.sql` | Table `assistant_usage` for the in-app assistant's limits (D-043; no question or answer text): users read their own rows within their organization; server writes only. Function `reserve_assistant_question` (security definer, service role only) counts the 24-hour and 1-minute windows and inserts a pending row under a per-organization advisory lock, before the model is called. |
| `20261017030000_mcp_oauth.sql` | MCP phase 2 (D-044): function `is_org_owner`; tables `oauth_clients` (service role only), `oauth_grants`, `oauth_authorization_codes` (service role only), `oauth_tokens`; `mcp_access_keys` gains `kind` (personal/service), `scopes`, `expires_at`, `created_by`, nullable `user_id` (service keys), owner-only service-key policies and one-way revocation; `mcp_tool_calls.oauth_grant_id`; triggers `memberships_owner_guard` (only owners make owners) and `oauth_clients_rate_limit` (atomic registration limits); function `oauth_cleanup` |
| `20261017110000_job_dispatches.sql` | Step hand-offs through Postgres (D-042, amended 2026-10-17). Extensions `pg_net` (schema `extensions`) and `pg_cron` (schema `pg_catalog`); unique (`id`, `organization_id`) on `ai_jobs`; table `job_dispatches` (analysis step hand-offs Postgres POSTs to `/api/jobs/continue`; holds HMAC tokens, so RLS with no policies and no client privileges: service role only); `AFTER INSERT` trigger posting each row with `net.http_post`; functions `post_job_dispatch`, `job_dispatch_failed`, `sweep_job_dispatches`, `cleanup_job_dispatches` (internal, no grants), `resend_job_dispatch` and `job_dispatch_health` (service role only); `pg_cron` jobs `braventa-job-dispatch-sweeper` (every minute) and `braventa-job-dispatch-cleanup` (hourly) |
| `20261023092945_roles_and_permissions.sql` | Roles and permissions foundation (D-046; [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md)). Replaces the `member_role` enum with the eight fixed roles (`member` rows become `analyst`; default `analyst`; the old type, renamed `member_role_v1`, was dropped from the SQL editor the same day because the MCP tool refuses destructive statements); function `has_permission(org, perm)` (security definer, `authenticated` only, no platform-staff bypass) holding the same matrix as `web/src/lib/team/roles.ts`; `content_items.created_by` (the author, set by the guard on client inserts); `guard_content_item_write` now also requires `content.approve` for a status change and `content.approve_own` (owner only) to approve one's own draft |
| `20261023063253_feature_modules.sql` | Feature modules (D-051 steps 1–5; [FEATURE_MODULES.md](FEATURE_MODULES.md)). Domain `module_id` (the registry's ids); tables `organization_modules` (per-organization overrides `enabled` and `config`; members read, server writes) and `module_runs` (one row per module that ran in an analysis job, with `sub_score`, `audit_run_id`, `report_id`, `rules_version`; members read, pipeline writes; same-organization composite FKs to `ai_jobs` and `audit_runs`); columns `diagnosis_findings.module_id` and `growth_plan_items.module_id`, backfilled by provenance and by area |
| `20261010164133_diagnosis_and_plan.sql` | Tables `diagnoses`, `diagnosis_findings`, `growth_plan_items` (ON-7, ON-8, MS-5): RLS read and update for members, no client inserts or deletes, and column grants so owners can change only verdicts, notes, statuses, confirmation and final priority; same-organization composite FKs |

| `20261011160802_website_audit.sql` | Tables `audit_runs` and `audit_findings` (Website Intelligence Phase 1): M-read, no client writes (pipeline writes with the admin client scoped to the job's organization), same-organization composite FKs; adds `diagnosis_findings.audit_refs text[]` |

All files above are applied to the Supabase project. Local file names match the versions recorded there
(`list_migrations`); name new files with the version the project records, or apply them with the
Supabase CLI so the two stay in step.

## 2. Tenancy model

- A **user** is a Supabase `auth.users` row. An **organization** is the tenant. **Memberships** join them with
  one of eight fixed roles (`owner`, `admin`, `marketing_manager`, `social_media_manager`, `copywriter`,
  `content_creator`, `analyst`, `client_approver`; D-046). What each role may do is the matrix in
  [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md), held in `web/src/lib/team/roles.ts` and `has_permission()`.
- MVP behaviour: one organization per user, created on first analysis by `create_organization()`.
  `getCurrentOrg()` (`web/src/lib/auth.ts`) takes the oldest membership.
- **Platform admins** (`platform_admins`) pass `is_member()` and `is_org_admin()` for **every** organization.
  There is no UI for this; rows are inserted manually.

## 3. Enums

| Enum | Values | Used by |
|---|---|---|
| `member_role` | `owner`, `admin`, `marketing_manager`, `social_media_manager`, `copywriter`, `content_creator`, `analyst`, `client_approver` (D-046; the earlier `member` became `analyst`) | `memberships.role` (default `analyst`) |
| `content_status` | `brief`, `draft`, `in_qa`, `needs_approval`, `approved`, `scheduled`, `published`, `rejected` | `content_items.status`. Code uses `brief`, `needs_approval`, `approved`, `rejected`. `draft`, `in_qa`, `scheduled`, `published` are reserved for future QA and publishing; nothing sets them |
| `job_status` | `queued`, `running`, `succeeded`, `failed` | `ai_jobs.status` |

Domain `module_id` (text limited to the fourteen feature module ids in `web/src/lib/modules/registry.ts`, D-051):
`organization_modules.module_id`, `module_runs.module_id`, `diagnosis_findings.module_id`, `growth_plan_items.module_id`.
Adding a module replaces the domain's constraint in a migration; `web/src/lib/modules/migration.test.ts` checks that
the SQL list and the registry agree.

## 4. Tables

RLS legend: **M-all** = policy "members all": `for all to authenticated using/with check is_member(organization_id)`.
**M-read** = "members read": select only for members; writes only via the admin (secret-key) client.

| Table | Purpose | Key columns | RLS | Used in code |
|---|---|---|---|---|
| `organizations` | Tenant | `id`, `name`, `slug` (unique, unused), `plan` (default `trial`), `monthly_ai_budget_usd` (default 5.00) | Select: `is_member(id)`. Update: `is_org_admin(id)`. No insert/delete policy (insert only via `create_organization`) | Yes: `lib/auth.ts`, `lib/ai/router.ts` (budget), health route |
| `memberships` | User-org link with role | PK (`organization_id`, `user_id`), `role` (`member_role`, default `analyst`) | Select: `is_member`. Insert/update/delete: `is_org_admin`; trigger `memberships_owner_guard` (only owners make owners) | Yes: `getCurrentOrg()`, `memberRole()` in `lib/team/server.ts` |
| `platform_admins` | Staff with cross-tenant access | `user_id` | Select own row only. No write policies | Only indirectly via `is_member()` |
| `business_profiles` | The analysed business; holds the Business Intelligence Profile | `organization_id`, `company_name`, `website_url`, `industry`, `services[]`, `target_customers`, `locations[]`, `competitors[]`, `offers`, `goals` / `service_area` / `current_tools` (Customer-provided guided-onboarding answers; never written by the pipeline), `intelligence` (jsonb, full AI profile), `growth_score` (0–100), `analyzed_at` | M-all | Yes: actions, pipeline, dashboard, analysis page |
| `brand_profiles` | Brand voice per business | `business_profile_id`, `voice`, `tone_rules[]`, `messaging_pillars[]`, `visual_guidelines` | M-all | Written by pipeline (one new row per run; never read) |
| `knowledge_documents` | Source material (crawled pages; later uploads, notes, CRM) | `source_type` (`website_page` today), `source_url`, `title`, `content`, `content_hash`; unique (`organization_id`, `content_hash`) | M-all | Written by pipeline (upsert, ignore duplicates); never read |
| `knowledge_chunks` | Embedded chunks for retrieval | `document_id`, `chunk_index`, `content`, `embedding vector(1536)` (HNSW cosine index) | M-all | **Not used** |
| `campaigns` | Campaign grouping | `name`, `objective`, `status` (text: planned/active/complete), `starts_on`, `ends_on` | M-all | **Not used** |
| `content_calendars` | A content plan | `campaign_id`, `title`, `strategy` (jsonb, includes `business_profile_id`), `starts_on`, `days` | M-all | Yes: pipeline writes; analysis page reads by `strategy->>business_profile_id` |
| `content_items` | One planned or drafted piece | `calendar_id`, `campaign_id`, `channel`, `content_type`, `scheduled_for`, `title`, `brief`, `body`, `qa_notes` (jsonb; currently holds `image_prompt`), `status`, `approved_by`, `approved_at`, `created_by` (the author; null for pipeline drafts; set by the guard on client inserts, D-046) | M-all; trigger `guard_content_item_write` limits client status changes to the approval rule (`content.approve`, own drafts `content.approve_own`) and sets the approver | Yes: pipeline, analysis page, `setContentStatus` |
| `integrations` | Connected external accounts per org (foundation design, Vault secret id) | `provider` (unique per org), `status`, `external_account_id`, `scopes[]`, `metadata`, `vault_secret_id`, `connected_at`, `last_synced_at` | M-read | **Not used**; Search Console uses `integration_connections` instead |
| `integration_connections` | OAuth connections to external services; today only `google_search_console` (Pro) | `provider` (unique per org), `connected_by`, `google_account_email`, `refresh_token_ciphertext` (AES-256-GCM `v1:iv:tag:ciphertext`, **not granted to clients**), `scopes[]`, `available_properties[]`, `selected_property`, `status` (`active`/`paused`/`revoked`/`error`; revoked ⇒ token null), `last_error`, `last_synced_at`, `last_attempted_at` (10-minute refresh guard) | Members select non-secret columns (column grants); writes by the service client only | Yes: OAuth callback, Settings → Connections, `lib/integrations/search-console.ts` |
| `search_console_snapshots` | One Search Console fetch: last 28 days vs the previous 28 | `connection_id` (composite FK with `organization_id`, same org), `property`, `date_range_start`, `date_range_end`, `dimensions[]`, `totals` (jsonb: current, previous, previousRange), `rows` (jsonb: queries, pages, devices, sitemaps, inspection, notes), `fetched_at`; 12 newest kept per org | M-read; writes by the service client only | Yes: sync writes; `/search` and Settings read. Deleted on disconnect |
| `ai_jobs` | Background job record and progress | `worker`, `task_class`, `status`, `input` (jsonb), `output` (jsonb; `step`, then `report_id`, `calendar_id`, `growth_score`), `error`, `n8n_execution_id` (unused), `created_by`, timestamps | M-all | Yes: actions (insert as user), pipeline (admin), pages (read) |
| `ai_usage` | Per-call AI ledger | `job_id`, `worker`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `status` (`ok`/`error`), `error` (one-line summary; failed calls cost 0) | M-read | Yes: written by `runWorker` via admin client; read through `ai_spend_mtd` |
| `reports` | Generated reports | `report_type` (`growth_plan` today; also intended `website_audit`, `crm_summary`), `title`, `summary`, `data` (jsonb: `growth_score`, `score_version`, `score_modules` and `module_scores` (the formula version and the feature modules the score used, D-051; missing on reports from before 2026-10-23), `search_console` (the Search Console snapshot the diagnosis and score used: property, period, `fetched_at`, `little_data`; null without one; D-051 step 6), scores, PageSpeed (mobile), signals (null when robots.txt blocked the site), pages, `discovery_priorities`, `audit_run_id`; `opportunities` only in reports from before 2026-10-11, now `growth_plan_items`, `business_profile_id`) | M-all | Yes: pipeline writes; analysis page reads by `data->>business_profile_id` |
| `onboarding_sessions` | One discovery run per analysis start | `business_profile_id` (composite FK, same org), `status` (`discovering`/`reviewing`/`following_up`/`completed`/`skipped`), `catalog_version`, `evidence_job_id`, `plan_job_id` (claimed once, so only one plan job starts), `created_by`, `completed_at` | M-all, with column grants (see migrations) | Yes: `startAnalysis`, onboarding actions, `startPlanIfReady`, analysis page, dashboard |
| `onboarding_responses` | The owner's answers (Customer-provided) | `session_id`, `kind` (`pain_point`/`statement`), `pain_point_id` (catalog ID), `source` (`owner_selected`/`ai_suggested`), `confirmed`, `original_text` (≤ 1000; the owner's words or the matched quote), `ai_confidence`, `customer_priority` (1–3, unique per session) | M-all | Yes: onboarding actions, `loadDiscovery` in the pipeline, analysis page |
| `onboarding_follow_ups` | Follow-up questions asked during onboarding and the owner's answers (Customer-provided) | `session_id`, `pain_point_id`, `question_key` (from `web/src/lib/onboarding/followups.ts`), `round` (1–2 today), `status` (`pending`/`answered`/`skipped`/`not_applicable`), `answer` (choice value or the owner's words), `answered_at`; unique (`session_id`, `pain_point_id`, `question_key`) | M-all | Yes: `addNextRound`, onboarding actions, `loadDiscovery`, analysis page |
| `diagnoses` | What is holding the business back, one per plan run or correction (ON-7) | `business_profile_id` (composite FK), `report_id`, `job_id`, `revises_id` (the diagnosis it corrects), `version`, `summary`, `missing_info[]`, `status` (`proposed`/`confirmed`/`superseded`), `confirmed_at`, `confirmed_by` | Read + update for members; owners may update only `status`, `confirmed_at`, `confirmed_by` | Yes: pipeline writes (`storeDiagnosis`); `confirmDiagnosis`; analysis page |
| `audit_runs` | One website audit per evidence or re-run job (Website Intelligence Phase 1) | `business_profile_id` (composite FK), `job_id`, `website_url`, `status` (`queued`/`running`/`completed`/`partial`/`failed`), `audit_version` (rule set version), `pages_discovered`, `pages_scanned`, `coverage` (jsonb: every URL as scanned / excluded with reason / failed with status, redirects, robots.txt and sitemap results, per-page measurements, `summary`), `pagespeed` (jsonb: mobile + desktop Lighthouse scores and lab metrics, CrUX field data, top opportunities, errors), `error_summary`, `started_at`, `completed_at` | M-read | Yes: pipeline writes (`runAudit`); analysis page reads via `reports.data.audit_run_id` |
| `audit_findings` | One deterministic check result | `audit_run_id` (composite FK), `ref` (`T1`… in priority order, unique per run), `page_url` (null = site-wide), `rule_id`, `category` (`indexability`/`technical`/`on_page`/`structured_data`/`performance`), `severity`, `confidence`, `priority_label` (`fix_first`/`improve_next`/`monitor`), `summary`, `observed` (jsonb), `recommendation`, `source_type` (`crawler_observation`/`pagespeed_lab`/`core_web_vitals_field_data`), `observed_at`, `status` (`detected`/`resolved`/`dismissed`; only `detected` is written today) | M-read | Yes: pipeline writes; technical checks dialog; `reviseDiagnosis` rebuilds the prompt from them |
| `diagnosis_findings` | One finding of a diagnosis | `diagnosis_id`, `position`, `statement`, `evidence`, `provenance` (`verified`/`customer_provided`/`inferred`; `verified` only when the finding cites an existing measurement), `audit_refs[]` (cited refs: `T…` audit findings, `S1` home signals, `P1`/`P2` PageSpeed mobile/desktop, `C1` coverage, `G1` the Google Search Console summary), `confidence`, `pain_point_ids[]`, `owner_verdict` (`pending`/`confirmed`/`rejected`), `owner_note`, `module_id` (the feature module it belongs to, D-051: `search_visibility` for verified citing `G1`, `website_seo` for other verified, `business_intel` for customer_provided, null for inferred) | Read + update for members; owners may update only `owner_verdict`, `owner_note` | Yes: pipeline writes; `setFindingVerdict`; `reviseDiagnosis` reads verdicts |
| `growth_plan_items` | The single prioritized plan (ON-8), replacing the report's five opportunities | `diagnosis_id`, `title`, `area`, `pain_point_ids[]`, `finding_positions[]`, `why`, `evidence`, `first_action`, `dependencies`, `success_metric`, `solution_ids[]`, `manual_alternative`, `impact`/`urgency`/`effort` (1–5), `urgency_from_owner`, `confidence`, `customer_priority`, `ai_priority`, `calculated_priority`, `final_priority`, `status` (`proposed`/`accepted`/`dismissed`/`done`, MS-5), `status_changed_at`, `status_changed_by`, `module_id` (the feature module it belongs to, from `area`, D-051; null for `operations`, unknown and empty areas) | Read + update for members; owners may update only `status`, `status_changed_*`, `final_priority` | Yes: pipeline writes; `confirmDiagnosis`, `setPlanItemStatus`; analysis page |
| `organization_modules` | Per-organization feature module overrides (D-051) | PK (`organization_id`, `module_id`), `enabled` (false drops the module from the growth score; can't switch on a module the tier doesn't include or that isn't live), `config` (jsonb, unused), `updated_at` | M-read; no client writes (who may change them comes with roles, D-046) | Read by the pipeline's scoring step (`enabledModules` in `web/src/lib/modules/server.ts`); nothing writes rows yet |
| `module_runs` | One feature module that ran in an analysis job (D-051) | `job_id` (composite FK with `organization_id` to `ai_jobs`, cascade), `module_id`, `audit_run_id` (composite FK to `audit_runs`, set null), `report_id`, `status` (`completed`/`partial`), `sub_score` (0–100 or null), `rules_version`, `details` (jsonb); unique (`job_id`, `module_id`) | M-read; pipeline writes | Yes: `recordModuleRuns` from the profiling step (business intelligence, website and technical SEO), the scoring step (conversion and messaging; search visibility for Pro, Premium and trial organizations: completed with a Search Console summary, partial without) and the writing step (content studio), best effort |
| `contact_requests` | Contact and early-access requests from braventa.io (not tenant data) | `intent` (`early_access`/`demo`/`question`), `name`, `email`, `business`, `website`, `message`, `marketing_opt_in` (D-014, default false), `status` (`new`/`replied`/`closed`/`spam`), `ip_hash` (salted HMAC of the IP, rate limiting only) | RLS insert for anon/authenticated; insert grant limited to form columns; no select | Yes: `sendContact` in `site/src/app/contact/actions.ts` |
| `upgrade_requests` | "Talk to us" requests for Pro or Premium while there is no billing (D-030) | `organization_id`, `requested_by` (default `auth.uid()`), `tier` (`basic`/`pro`/`premium`; Basic since D-036, for businesses whose trial ended), `message` (≤ 1000), `status` (`open`/`contacted`/`closed`) | Read + insert for members; insert limited to `organization_id`, `tier`, `message` | Yes: `requestUpgrade` on `/plans` |
| `mcp_access_keys` | Personal access keys (D-036) and service keys (MCP phase 2) for the MCP server | `organization_id`, `kind` (`personal`/`service`), `user_id` (null for service keys), `created_by`, `name`, `key_prefix`, `key_hash` (SHA-256, never readable by clients), `scopes` (default `onboarding`; clients can't set it), `expires_at`, `last_used_at`, `revoked_at` | Personal: each person reads, inserts and revokes their own. Service: owners only (`is_org_owner`); a trigger clears `user_id`. Column grants exclude the hash | Yes: Settings → Integrations; looked up by `/api/mcp` with the service client |
| `mcp_tool_calls` | Audit log and rate-limit source for MCP tool calls (D-036) | `organization_id`, `key_id` or `oauth_grant_id`, `tool`, `ok`, `error` | Members read; server writes only | Yes: written by `/api/mcp` |
| `oauth_clients` | Apps registered through `/oauth/register` (RFC 7591). Not tenant data | `client_id`, `client_name`, `client_uri`, `redirect_uris`, `token_endpoint_auth_method`, `client_secret_hash`, `registration_ip_hash`, `first_party` | RLS on, no policies: service role only | Yes: `/oauth/*` (after migration 20261017030000) |
| `oauth_grants` | One approval for an app to use the MCP server for one organization; its tokens belong to it | `organization_id`, `user_id`, `client_id`, `client_name`, `scopes`, `resource`, `last_used_at`, `revoked_at`, `revoked_reason` | Members read non-secret columns; server writes only | Yes: Settings → Connected apps, `/oauth/token`, `/api/mcp` |
| `oauth_authorization_codes` | One-time authorization codes (10 minutes) | `code_hash`, `client_id`, `organization_id`, `user_id`, `grant_id`, `redirect_uri`, `code_challenge`, `scopes`, `resource`, `expires_at`, `used_at` | RLS on, no policies: service role only | Yes: `/oauth/authorize`, `/oauth/token` |
| `oauth_tokens` | OAuth access (1 h) and refresh (30 days, rotated) tokens | `organization_id`, `user_id`, `client_id`, `grant_id`, `kind` (`access`/`refresh`), `token_hash` (never readable by clients), `scopes`, `resource`, `expires_at`, `revoked_at`, `rotated_at` and `successor_id` (rotated refresh tokens), `last_used_at` | Members read non-secret columns; server writes only | Yes: `/oauth/token`, `/api/mcp` |
| `assistant_usage` | In-app assistant rate-limit source, one row per question (D-043). Stores no question or answer text; tokens and cost are in `ai_usage` | `organization_id`, `user_id`, `status` (`pending`/`answered`/`failed`), `created_at`, `finished_at` | Users read their own rows in their organization; server writes only (reserved by `reserve_assistant_question`, settled by `/api/assistant`) | Yes: written by `/api/assistant` |
| `job_dispatches` | Analysis step hand-offs that Postgres POSTs to `/api/jobs/continue` with `pg_net` in production (D-042, amended 2026-10-17); re-posted by a `pg_cron` sweeper while the step is still pending | `organization_id`, `job_id` (composite FK to `ai_jobs` with `organization_id`, cascade), `step`, `url` (must be `https://<host>/api/jobs/continue`), `token` (HMAC of job id + step, **secret**), `attempts`, `last_sent_at`, `last_request_id` (`pg_net` request id), `created_at`; unique (`job_id`, `step`) | RLS on, **no policies**, all privileges revoked from `anon`/`authenticated`: service role only. Rows deleted with the job and after a day | Yes: inserted by `lib/pipeline/dispatch.ts` (service client, scoped to the job's organization); posted by the trigger, `sweep_job_dispatches` and `resend_job_dispatch`; the sweeper also fails the job of a dispatch whose post was refused |
| `subscriptions` | Billing state per org | `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status` (default `trialing`), `current_period_end` | M-read | **Not used** (billing not implemented) |

Triggers: `touch_updated_at()` maintains `updated_at` on `business_profiles`, `brand_profiles`,
`content_items`, `subscriptions`, `integration_connections`, `organization_modules`.

Indexes: every tenant table has an `organization_id` index (`ai_jobs`, `reports` composite with
`created_at desc`; `ai_usage` composite with `created_at`); FK indexes added by the advisor migration.
`integrations` and `subscriptions` rely on their unique constraints. Note: the analysis page filters
`ai_jobs` by `input->>businessProfileId`, `reports` by `data->>business_profile_id` and
`content_calendars` by `strategy->>business_profile_id` — jsonb lookups with no index. Fine at PoC volume;
promote these to real `business_profile_id` FK columns before scale.

## 5. Views

| View | Definition | Security | Used |
|---|---|---|---|
| `ai_spend_mtd` | Per-org `sum(cost_usd)` and `sum(input_tokens + output_tokens)` from `ai_usage` since the start of the current month (database time zone, UTC by default) | `security_invoker = true`, so RLS on `ai_usage` applies to user clients | Yes: budget check in `runWorker` (admin client) |

## 6. Functions

| Function | Kind | Purpose | Grants | Used |
|---|---|---|---|---|
| `is_member(org uuid)` | SQL, `stable`, `security definer`, empty `search_path` | True if caller has a membership in `org` or is a platform admin. Definer avoids RLS recursion through `memberships` | `authenticated` only (after advisor fixes) | By every tenant RLS policy |
| `is_org_admin(org uuid)` | Same | True for `owner`/`admin` members or platform admins | `authenticated` only | Org update and membership write policies |
| `is_org_owner(org uuid)` | SQL, `stable`, `security definer`, empty `search_path` | True for `owner` members of `org` (no platform-admin bypass) | `authenticated` only | Service-key policies on `mcp_access_keys` |
| `has_permission(org uuid, perm text)` | SQL, `stable`, `security definer`, empty `search_path` | True when the caller's membership role in `org` holds `perm` (the matrix in [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md), equal to `can()` in `web/src/lib/team/roles.ts`; an unknown `perm` is false; no platform-admin bypass) | `authenticated` only | `guard_content_item_write`; RLS write policies later |
| `create_organization(org_name text)` | plpgsql, `security definer` | Creates an org and an `owner` membership for `auth.uid()`; raises if unauthenticated | `authenticated` only | `startAnalysis` |
| `match_knowledge(org, query_embedding, match_count)` | SQL, `stable`, invoker | Cosine similarity search over `knowledge_chunks` for an org; RLS still applies because it is not definer | Default (public) | **Not used** |
| `touch_updated_at()` | Trigger | Sets `updated_at = now()` | n/a | Triggers |
| `post_job_dispatch(p_id bigint)` | plpgsql, `security definer`, empty `search_path` | POSTs one `job_dispatches` row (`net.http_post`, 10 s timeout) and records `attempts`, `last_sent_at`, `last_request_id` | None (owner only) | Trigger `job_dispatches_send` (`AFTER INSERT`), the sweeper, `resend_job_dispatch` |
| `job_dispatch_failed(p_request_id bigint, p_attempts int)` | SQL, `stable`, `security definer` | Whether a hand-off failed for good, from `pg_net`'s response to its last post (`net._http_response`): refused (anything but 202, 408, 429 or 5xx), or a 4th post that failed too (timeout, connection error, 408, 429, 5xx) | None (owner only) | The sweeper, `resend_job_dispatch` |
| `sweep_job_dispatches()` | plpgsql, `security definer` | For dispatches whose job is active with that step still pending (50 per run): fails the job like `failPendingStep` ("The analysis couldn't continue. Run it again.") when `job_dispatch_failed`, else re-posts when the last post is over 60 s old and fewer than 4 posts were made | None (owner only) | `pg_cron` job `braventa-job-dispatch-sweeper`, every minute |
| `cleanup_job_dispatches()` | plpgsql, `security definer` | Deletes dispatches older than a day and the two dispatch cron jobs' run history older than 7 days | None (owner only) | `pg_cron` job `braventa-job-dispatch-cleanup`, hourly |
| `resend_job_dispatch(p_organization_id, p_job_id, p_step)` | plpgsql, `security definer` | The report page's re-send: `'posted'` (re-posted the stored dispatch while the step is pending), `'not_pending'`, `'failed'` (`job_dispatch_failed`: the app then fails the job) or `'missing'` (no dispatch: the app records one) | `service_role` only | `lib/pipeline/dispatch.ts` |
| `job_dispatch_health()` | plpgsql, `stable`, `security definer` | `pg_net`/`pg_cron` versions, whether `pg_net`'s worker runs (`pg_stat_activity`), whether the sweeper is scheduled and its last run, hand-offs in the last day, failed posts in the last 6 h (and by status code), posts with no answer after 2 minutes (and how many are still queued); no tokens. Read by `lib/pipeline/dispatch-health.ts` | `service_role` only | `/api/health/integrations`, `npm run health` |

## 7. ER diagram (main relationships)

```mermaid
erDiagram
  AUTH_USERS ||--o{ MEMBERSHIPS : has
  ORGANIZATIONS ||--o{ MEMBERSHIPS : has
  AUTH_USERS ||--o| PLATFORM_ADMINS : "may be"
  ORGANIZATIONS ||--o{ BUSINESS_PROFILES : owns
  BUSINESS_PROFILES ||--o{ BRAND_PROFILES : "voice for"
  ORGANIZATIONS ||--o{ KNOWLEDGE_DOCUMENTS : owns
  KNOWLEDGE_DOCUMENTS ||--o{ KNOWLEDGE_CHUNKS : "split into"
  ORGANIZATIONS ||--o{ CAMPAIGNS : owns
  CAMPAIGNS |o--o{ CONTENT_CALENDARS : groups
  CONTENT_CALENDARS |o--o{ CONTENT_ITEMS : schedules
  CAMPAIGNS |o--o{ CONTENT_ITEMS : groups
  ORGANIZATIONS ||--o{ AI_JOBS : runs
  AI_JOBS |o--o{ AI_USAGE : "billed to"
  ORGANIZATIONS ||--o{ AI_USAGE : spends
  ORGANIZATIONS ||--o{ REPORTS : owns
  ORGANIZATIONS ||--o{ INTEGRATIONS : connects
  ORGANIZATIONS ||--o| SUBSCRIPTIONS : "billed by"
  ORGANIZATIONS ||--o{ ORGANIZATION_MODULES : configures
  AI_JOBS ||--o{ MODULE_RUNS : "ran modules"

  ORGANIZATIONS { uuid id PK; text name; numeric monthly_ai_budget_usd }
  MEMBERSHIPS { uuid organization_id PK; uuid user_id PK; member_role role }
  BUSINESS_PROFILES { uuid id PK; uuid organization_id FK; text website_url; jsonb intelligence; int growth_score }
  CONTENT_ITEMS { uuid id PK; uuid organization_id FK; uuid calendar_id FK; content_status status; uuid approved_by }
  AI_JOBS { uuid id PK; uuid organization_id FK; text worker; job_status status; jsonb input; jsonb output }
  AI_USAGE { bigint id PK; uuid organization_id FK; uuid job_id FK; text model; numeric cost_usd }
  MODULE_RUNS { uuid id PK; uuid organization_id FK; uuid job_id FK; text module_id; text status; smallint sub_score }
```

Implicit (jsonb, not FK) links used by current code: `ai_jobs.input.businessProfileId`,
`reports.data.business_profile_id`, `content_calendars.strategy.business_profile_id` all point at
`business_profiles.id`. All tenant tables cascade-delete with their organization; `auth.users` deletion
cascades memberships and platform-admin rows and leaves `approved_by` / `created_by` pointing at a missing
user (no `on delete` clause, so user deletion fails while such references exist — see
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md#10-data-retention-and-deletion)).

## 8. Observations

- **Write breadth of M-all.** Any member can insert, update and delete every M-all table directly through
  the Supabase Data API using the publishable key, not only through the app's server actions. In particular
  a member can edit `ai_jobs.status`/`output` and `reports`. `content_items` status and approver are
  guarded by a trigger (migration `20261010121043`, D-018): clients can only
  move between `needs_approval`/`approved`/`rejected`, and `approved_by` is always `auth.uid()`. Acceptable
  while one user = one org; revisit before multi-user orgs (role-based write policies).
- **Unbounded org creation.** `create_organization` can be called repeatedly by any authenticated user;
  each new org gets a fresh $5 AI budget.
- **No uniqueness on per-run artefacts.** Each re-run appends a new `brand_profiles`, `reports`,
  `content_calendars` and 20–30 `content_items`; old ones are kept indefinitely.

## 9. Rules for adding tables

1. **Tenant scoping.** Every customer-data table has `organization_id uuid not null references
   public.organizations(id) on delete cascade` and an index on it (composite with `created_at desc` when
   listed by recency).
2. **RLS in the same migration.** `alter table ... enable row level security` plus policies using
   `public.is_member(organization_id)` (read/write) or `public.is_org_admin(organization_id)` (admin
   writes). Choose explicitly between M-all and M-read; server-written ledgers (usage, billing, tokens,
   audit) are M-read.
3. **No new `security definer` functions** unless needed to avoid RLS recursion or to perform a vetted
   multi-step write; always `set search_path = ''`, revoke from `public, anon`, grant to `authenticated`.
4. **Views** use `with (security_invoker = true)`.
5. **FK indexes** for every foreign key used by cascades or joins (the Supabase advisor flags missing ones).
6. **Real FK columns** instead of ids buried in jsonb when the app filters or joins on them.
7. **Status columns** use an enum when the state machine matters to the app (as `content_status`,
   `job_status`); text with a comment is acceptable only for provider-defined values.
8. **Timestamps**: `created_at timestamptz not null default now()`; add `updated_at` and register the
   `touch_updated_at` trigger when rows are edited.
9. **Secrets never in plain columns**: store a Vault secret id (pattern: `integrations.vault_secret_id`).
10. **Migration naming**: `supabase/migrations/YYYYMMDDHHMMSS_short_snake_description.sql`, timestamps
    increasing, one concern per file. Never edit an applied migration; add a new one. After applying, run
    the Supabase security and performance advisors and fix findings in a follow-up migration (as
    `20261010061126_advisor_fixes.sql` did).
11. Update this document (tables, usage column, ER diagram) in the same change.
