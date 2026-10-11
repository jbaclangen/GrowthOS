-- Website Intelligence, Phase 1 (reliable core audit): one row per website audit (crawl coverage, robots.txt,
-- sitemap, PageSpeed mobile + desktop with field and lab data) and the deterministic findings it produced.
-- Rows are written by the analysis pipeline with the service role, scoped to the job's organization.
-- Members can read their organization's audits; nothing is writable from the client yet.

create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_profile_id uuid not null,
  -- The analysis job that ran the audit (website_evidence or website_intel).
  job_id uuid references public.ai_jobs(id) on delete set null,
  website_url text not null check (char_length(website_url) <= 2048),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'partial', 'failed')),
  -- Version of the check rules (lib/audit/checks.ts AUDIT_VERSION), so runs with different rules aren't compared.
  audit_version integer not null default 1,
  pages_discovered integer not null default 0 check (pages_discovered >= 0),
  pages_scanned integer not null default 0 check (pages_scanned >= 0),
  -- Every URL considered (scanned / excluded with reason / failed with status), robots.txt and sitemap results,
  -- per-page measurements and limits. Crawled values are untrusted data.
  coverage jsonb not null default '{}'::jsonb,
  -- PageSpeed Insights mobile and desktop: Lighthouse lab scores and metrics, CrUX field data, top opportunities.
  pagespeed jsonb not null default '{}'::jsonb,
  error_summary text check (error_summary is null or char_length(error_summary) <= 2000),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (business_profile_id, organization_id)
    references public.business_profiles(id, organization_id) on delete cascade
);
create index audit_runs_org_idx on public.audit_runs(organization_id);
create index audit_runs_profile_idx on public.audit_runs(business_profile_id, created_at desc);
create index audit_runs_job_idx on public.audit_runs(job_id);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  audit_run_id uuid not null,
  -- Short id within the run ("T1", "T2", … in priority order); the diagnosis cites these.
  ref text not null check (char_length(ref) <= 16),
  page_url text check (page_url is null or char_length(page_url) <= 2048), -- null = site-wide
  rule_id text not null check (char_length(rule_id) <= 64),
  category text not null check (category in ('indexability', 'technical', 'on_page', 'structured_data', 'performance')),
  severity text not null check (severity in ('high', 'medium', 'low')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  priority_label text not null check (priority_label in ('fix_first', 'improve_next', 'monitor')),
  summary text not null check (char_length(summary) <= 1000),
  observed jsonb not null default '{}'::jsonb,
  recommendation text not null default '' check (char_length(recommendation) <= 1000),
  source_type text not null check (source_type in ('crawler_observation', 'pagespeed_lab', 'core_web_vitals_field_data')),
  observed_at timestamptz not null default now(),
  status text not null default 'detected' check (status in ('detected', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (audit_run_id, ref),
  foreign key (audit_run_id, organization_id)
    references public.audit_runs(id, organization_id) on delete cascade
);
create index audit_findings_org_idx on public.audit_findings(organization_id);
create index audit_findings_run_idx on public.audit_findings(audit_run_id);

alter table public.audit_runs enable row level security;
alter table public.audit_findings enable row level security;

create policy "members read" on public.audit_runs for select to authenticated using (public.is_member(organization_id));
create policy "members read" on public.audit_findings for select to authenticated using (public.is_member(organization_id));

-- Written only by the pipeline (service role).
revoke insert, update, delete on public.audit_runs, public.audit_findings from authenticated, anon;

-- Diagnosis findings cite the audit findings they rest on. A "website" or "pagespeed" finding without a valid
-- citation is stored as inferred, so "Verified" means "matched to a stored observation".
alter table public.diagnosis_findings
  add column audit_refs text[] not null default '{}' check (cardinality(audit_refs) <= 20);

comment on table public.audit_runs is 'One website audit: crawl coverage (robots.txt respected), sitemap, PageSpeed mobile + desktop (Website Intelligence Phase 1).';
comment on table public.audit_findings is 'A deterministic check result with rule_id, severity, confidence, priority label, observed value and source (Website Intelligence Phase 1).';
comment on column public.diagnosis_findings.audit_refs is 'Refs (T1, S1, P1, …) of the audit observations this finding cites; empty for owner-provided and inferred findings.';
