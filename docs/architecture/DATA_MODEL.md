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
| `20261011042846_plan_tiers_and_trial.sql` | `organizations.plan` checked to `trial`/`basic`/`pro`/`premium`; `organizations.trial_ends_at` (default now + 14 days); owners may update only `name` and `slug` (fixes owners being able to change their own plan and AI budget); table `upgrade_requests` (D-030) |
| `20261010164133_diagnosis_and_plan.sql` | Tables `diagnoses`, `diagnosis_findings`, `growth_plan_items` (ON-7, ON-8, MS-5): RLS read and update for members, no client inserts or deletes, and column grants so owners can change only verdicts, notes, statuses, confirmation and final priority; same-organization composite FKs |

All are applied to the Supabase project. Local file names match the versions recorded there
(`list_migrations`); name new files with the version the project records, or apply them with the
Supabase CLI so the two stay in step.

## 2. Tenancy model

- A **user** is a Supabase `auth.users` row. An **organization** is the tenant. **Memberships** join them with
  a role (`owner`, `admin`, `member`).
- MVP behaviour: one organization per user, created on first analysis by `create_organization()`.
  `getCurrentOrg()` (`web/src/lib/auth.ts`) takes the oldest membership.
- **Platform admins** (`platform_admins`) pass `is_member()` and `is_org_admin()` for **every** organization.
  There is no UI for this; rows are inserted manually.

## 3. Enums

| Enum | Values | Used by |
|---|---|---|
| `member_role` | `owner`, `admin`, `member` | `memberships.role` |
| `content_status` | `brief`, `draft`, `in_qa`, `needs_approval`, `approved`, `scheduled`, `published`, `rejected` | `content_items.status`. Code uses `brief`, `needs_approval`, `approved`, `rejected`. `draft`, `in_qa`, `scheduled`, `published` are reserved for future QA and publishing; nothing sets them |
| `job_status` | `queued`, `running`, `succeeded`, `failed` | `ai_jobs.status` |

## 4. Tables

RLS legend: **M-all** = policy "members all": `for all to authenticated using/with check is_member(organization_id)`.
**M-read** = "members read": select only for members; writes only via the admin (secret-key) client.

| Table | Purpose | Key columns | RLS | Used in code |
|---|---|---|---|---|
| `organizations` | Tenant | `id`, `name`, `slug` (unique, unused), `plan` (default `trial`), `monthly_ai_budget_usd` (default 5.00) | Select: `is_member(id)`. Update: `is_org_admin(id)`. No insert/delete policy (insert only via `create_organization`) | Yes: `lib/auth.ts`, `lib/ai/router.ts` (budget), health route |
| `memberships` | User-org link with role | PK (`organization_id`, `user_id`), `role` | Select: `is_member`. Insert/update/delete: `is_org_admin` | Yes: `getCurrentOrg()` |
| `platform_admins` | Staff with cross-tenant access | `user_id` | Select own row only. No write policies | Only indirectly via `is_member()` |
| `business_profiles` | The analysed business; holds the Business Intelligence Profile | `organization_id`, `company_name`, `website_url`, `industry`, `services[]`, `target_customers`, `locations[]`, `competitors[]`, `offers`, `goals` / `service_area` / `current_tools` (Customer-provided guided-onboarding answers; never written by the pipeline), `intelligence` (jsonb, full AI profile), `growth_score` (0–100), `analyzed_at` | M-all | Yes: actions, pipeline, dashboard, analysis page |
| `brand_profiles` | Brand voice per business | `business_profile_id`, `voice`, `tone_rules[]`, `messaging_pillars[]`, `visual_guidelines` | M-all | Written by pipeline (one new row per run; never read) |
| `knowledge_documents` | Source material (crawled pages; later uploads, notes, CRM) | `source_type` (`website_page` today), `source_url`, `title`, `content`, `content_hash`; unique (`organization_id`, `content_hash`) | M-all | Written by pipeline (upsert, ignore duplicates); never read |
| `knowledge_chunks` | Embedded chunks for retrieval | `document_id`, `chunk_index`, `content`, `embedding vector(1536)` (HNSW cosine index) | M-all | **Not used** |
| `campaigns` | Campaign grouping | `name`, `objective`, `status` (text: planned/active/complete), `starts_on`, `ends_on` | M-all | **Not used** |
| `content_calendars` | A content plan | `campaign_id`, `title`, `strategy` (jsonb, includes `business_profile_id`), `starts_on`, `days` | M-all | Yes: pipeline writes; analysis page reads by `strategy->>business_profile_id` |
| `content_items` | One planned or drafted piece | `calendar_id`, `campaign_id`, `channel`, `content_type`, `scheduled_for`, `title`, `brief`, `body`, `qa_notes` (jsonb; currently holds `image_prompt`), `status`, `approved_by`, `approved_at` | M-all | Yes: pipeline, analysis page, `setContentStatus` |
| `integrations` | Connected external accounts per org | `provider` (unique per org), `status`, `external_account_id`, `scopes[]`, `metadata`, `vault_secret_id`, `connected_at`, `last_synced_at` | M-read | **Not used** |
| `ai_jobs` | Background job record and progress | `worker`, `task_class`, `status`, `input` (jsonb), `output` (jsonb; `step`, then `report_id`, `calendar_id`, `growth_score`), `error`, `n8n_execution_id` (unused), `created_by`, timestamps | M-all | Yes: actions (insert as user), pipeline (admin), pages (read) |
| `ai_usage` | Per-call AI ledger | `job_id`, `worker`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `status` (`ok`/`error`), `error` (one-line summary; failed calls cost 0) | M-read | Yes: written by `runWorker` via admin client; read through `ai_spend_mtd` |
| `reports` | Generated reports | `report_type` (`growth_plan` today; also intended `website_audit`, `crm_summary`), `title`, `summary`, `data` (jsonb: scores, PageSpeed, signals, pages, `discovery_priorities`; `opportunities` only in reports from before 2026-10-11, now `growth_plan_items`, `business_profile_id`) | M-all | Yes: pipeline writes; analysis page reads by `data->>business_profile_id` |
| `onboarding_sessions` | One discovery run per analysis start | `business_profile_id` (composite FK, same org), `status` (`discovering`/`reviewing`/`following_up`/`completed`/`skipped`), `catalog_version`, `evidence_job_id`, `plan_job_id` (claimed once, so only one plan job starts), `created_by`, `completed_at` | M-all, with column grants (see migrations) | Yes: `startAnalysis`, onboarding actions, `startPlanIfReady`, analysis page, dashboard |
| `onboarding_responses` | The owner's answers (Customer-provided) | `session_id`, `kind` (`pain_point`/`statement`), `pain_point_id` (catalog ID), `source` (`owner_selected`/`ai_suggested`), `confirmed`, `original_text` (≤ 1000; the owner's words or the matched quote), `ai_confidence`, `customer_priority` (1–3, unique per session) | M-all | Yes: onboarding actions, `loadDiscovery` in the pipeline, analysis page |
| `onboarding_follow_ups` | Follow-up questions asked during onboarding and the owner's answers (Customer-provided) | `session_id`, `pain_point_id`, `question_key` (from `web/src/lib/onboarding/followups.ts`), `round` (1–2 today), `status` (`pending`/`answered`/`skipped`/`not_applicable`), `answer` (choice value or the owner's words), `answered_at`; unique (`session_id`, `pain_point_id`, `question_key`) | M-all | Yes: `addNextRound`, onboarding actions, `loadDiscovery`, analysis page |
| `diagnoses` | What is holding the business back, one per plan run or correction (ON-7) | `business_profile_id` (composite FK), `report_id`, `job_id`, `revises_id` (the diagnosis it corrects), `version`, `summary`, `missing_info[]`, `status` (`proposed`/`confirmed`/`superseded`), `confirmed_at`, `confirmed_by` | Read + update for members; owners may update only `status`, `confirmed_at`, `confirmed_by` | Yes: pipeline writes (`storeDiagnosis`); `confirmDiagnosis`; analysis page |
| `diagnosis_findings` | One finding of a diagnosis | `diagnosis_id`, `position`, `statement`, `evidence`, `provenance` (`verified`/`customer_provided`/`inferred`), `confidence`, `pain_point_ids[]`, `owner_verdict` (`pending`/`confirmed`/`rejected`), `owner_note` | Read + update for members; owners may update only `owner_verdict`, `owner_note` | Yes: pipeline writes; `setFindingVerdict`; `reviseDiagnosis` reads verdicts |
| `growth_plan_items` | The single prioritized plan (ON-8), replacing the report's five opportunities | `diagnosis_id`, `title`, `area`, `pain_point_ids[]`, `finding_positions[]`, `why`, `evidence`, `first_action`, `dependencies`, `success_metric`, `solution_ids[]`, `manual_alternative`, `impact`/`urgency`/`effort` (1–5), `urgency_from_owner`, `confidence`, `customer_priority`, `ai_priority`, `calculated_priority`, `final_priority`, `status` (`proposed`/`accepted`/`dismissed`/`done`, MS-5), `status_changed_at`, `status_changed_by` | Read + update for members; owners may update only `status`, `status_changed_*`, `final_priority` | Yes: pipeline writes; `confirmDiagnosis`, `setPlanItemStatus`; analysis page |
| `upgrade_requests` | "Talk to us" requests for Pro or Premium while there is no billing (D-030) | `organization_id`, `requested_by` (default `auth.uid()`), `tier` (`pro`/`premium`), `message` (≤ 1000), `status` (`open`/`contacted`/`closed`) | Read + insert for members; insert limited to `organization_id`, `tier`, `message` | Yes: `requestUpgrade` on `/plans` |
| `subscriptions` | Billing state per org | `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status` (default `trialing`), `current_period_end` | M-read | **Not used** (billing not implemented) |

Triggers: `touch_updated_at()` maintains `updated_at` on `business_profiles`, `brand_profiles`,
`content_items`, `subscriptions`.

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
| `create_organization(org_name text)` | plpgsql, `security definer` | Creates an org and an `owner` membership for `auth.uid()`; raises if unauthenticated | `authenticated` only | `startAnalysis` |
| `match_knowledge(org, query_embedding, match_count)` | SQL, `stable`, invoker | Cosine similarity search over `knowledge_chunks` for an org; RLS still applies because it is not definer | Default (public) | **Not used** |
| `touch_updated_at()` | Trigger | Sets `updated_at = now()` | n/a | Triggers |

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

  ORGANIZATIONS { uuid id PK; text name; numeric monthly_ai_budget_usd }
  MEMBERSHIPS { uuid organization_id PK; uuid user_id PK; member_role role }
  BUSINESS_PROFILES { uuid id PK; uuid organization_id FK; text website_url; jsonb intelligence; int growth_score }
  CONTENT_ITEMS { uuid id PK; uuid organization_id FK; uuid calendar_id FK; content_status status; uuid approved_by }
  AI_JOBS { uuid id PK; uuid organization_id FK; text worker; job_status status; jsonb input; jsonb output }
  AI_USAGE { bigint id PK; uuid organization_id FK; uuid job_id FK; text model; numeric cost_usd }
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
