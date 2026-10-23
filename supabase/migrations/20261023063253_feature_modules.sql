-- Feature modules, D-051 steps 1–5. The registry is web/src/lib/modules/registry.ts; the growth score over modules
-- is web/src/lib/modules/score.ts. No result an owner sees changes: the score formula is unchanged (score.test.ts
-- proves it against the old blend), existing rows are only labelled, and nothing can switch a module off yet.
--
-- - Domain module_id: the registry's ids, so no column can hold a module that doesn't exist. Adding a module means a
--   migration that replaces the domain's constraint and a registry entry; web/src/lib/modules/migration.test.ts checks
--   that the two lists agree.
-- - organization_modules: per-organization overrides (enabled, config). The pipeline reads them to decide which
--   modules feed the growth score (lib/modules/server.ts enabledModules); nothing writes them yet, so every
--   organization has every live module its tier includes. Members read; writes stay with the server until roles
--   (D-046) decide who may change them.
-- - module_runs: one row per module that ran in an analysis job, with its sub-score when the module is scored.
--   Written by the pipeline (service role, scoped to the job's organization); members read.
-- - diagnosis_findings.module_id and growth_plan_items.module_id: the module a finding or a plan item belongs to.
--   Backfilled where it can be derived, with the rules the code applies to new rows (registry.ts moduleForFinding
--   and moduleForArea): a finding from the website checks or PageSpeed (verified) belongs to website and technical
--   SEO, one the owner provided to business intelligence, an inferred one to no module; a plan item follows its area
--   (the plan prompt asks for one of website, seo, content, conversion, social, crm, ads or operations, but the column
--   is free text and may hold a comma-joined list), taking the first value and leaving operations, unknown and empty
--   values null.
--
-- Apply before the app version that uses it is deployed: the pipeline inserts module_runs rows (best effort, logged)
-- and reads organization_modules (a failed read fails the scoring step).

create domain public.module_id as text
  check (value in ('business_intel', 'website_seo', 'conversion', 'content_studio', 'search_visibility', 'local_seo', 'social', 'search_ads', 'email', 'video', 'crm', 'analytics', 'automation', 'custom_integrations'));
comment on domain public.module_id is 'A feature module id from web/src/lib/modules/registry.ts (D-051). Add a module by replacing this constraint in a migration.';

create table public.organization_modules (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id public.module_id not null,
  -- false drops the module from the growth score. It can't switch on a module the tier doesn't include or that
  -- isn't live (lib/modules/registry.ts enabledModuleIds).
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, module_id)
);

create table public.module_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- The analysis job the module ran in (website_evidence, website_plan or website_intel).
  job_id uuid not null,
  module_id public.module_id not null,
  -- The website audit its evidence came from (website and technical SEO).
  audit_run_id uuid,
  -- The report its result fed, when one existed by then.
  report_id uuid references public.reports(id) on delete set null,
  -- completed: everything the module collects was collected; partial: it ran, but some evidence is missing (for
  -- example PageSpeed didn't respond).
  status text not null check (status in ('completed', 'partial')),
  -- The module's own 0–100 score (lib/modules/score.ts subScore); null for a module that isn't scored, or that had
  -- nothing to score.
  sub_score smallint check (sub_score is null or sub_score between 0 and 100),
  -- The module's rule-set version: AUDIT_VERSION (lib/audit/checks.ts) for website and technical SEO; 1 until a
  -- module has versioned rules of its own.
  rules_version integer not null default 1,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, module_id),
  foreign key (job_id, organization_id) references public.ai_jobs(id, organization_id) on delete cascade,
  foreign key (audit_run_id, organization_id) references public.audit_runs(id, organization_id) on delete set null (audit_run_id)
);
create index module_runs_org_idx on public.module_runs(organization_id, created_at desc);
create index module_runs_job_idx on public.module_runs(job_id);
create index module_runs_audit_run_idx on public.module_runs(audit_run_id);
create index module_runs_report_idx on public.module_runs(report_id);

alter table public.organization_modules enable row level security;
alter table public.module_runs enable row level security;
create policy "members read" on public.organization_modules for select to authenticated using (public.is_member(organization_id));
create policy "members read" on public.module_runs for select to authenticated using (public.is_member(organization_id));
-- Written by the server only (service role).
revoke insert, update, delete on public.organization_modules, public.module_runs from authenticated, anon;

create trigger touch_updated_at before update on public.organization_modules
  for each row execute function public.touch_updated_at();

-- The module a finding or a plan item belongs to. Not granted to clients: owners keep updating only their verdicts,
-- notes, statuses and final priorities (20261010164133_diagnosis_and_plan).
alter table public.diagnosis_findings add column module_id public.module_id;
alter table public.growth_plan_items add column module_id public.module_id;

update public.diagnosis_findings
  set module_id = case provenance
    when 'verified' then 'website_seo'
    when 'customer_provided' then 'business_intel'
  end
  where module_id is null;

update public.growth_plan_items
  set module_id = case lower(btrim(split_part(area, ',', 1)))
    when 'website' then 'website_seo'
    when 'seo' then 'website_seo'
    when 'content' then 'content_studio'
    when 'conversion' then 'conversion'
    when 'social' then 'social'
    when 'crm' then 'crm'
    when 'ads' then 'search_ads'
  end
  where module_id is null;

comment on table public.organization_modules is 'Per-organization feature module overrides (D-051): enabled drops a module from the growth score. Nothing writes rows yet; members read, server writes.';
comment on table public.module_runs is 'One row per feature module that ran in an analysis job (D-051), with its sub-score when scored. Written by the pipeline; members read.';
comment on column public.diagnosis_findings.module_id is 'The feature module the finding belongs to (D-051): website_seo for verified, business_intel for customer_provided, null for inferred.';
comment on column public.growth_plan_items.module_id is 'The feature module the plan item belongs to (D-051), from its area; null for operations and unknown areas.';
