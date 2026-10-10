-- AI-assisted onboarding, stage 1 (ON-1 – ON-4, D-028): discovery sessions and responses.
-- Pain-point IDs refer to the versioned catalog in web/src/lib/onboarding/catalog.ts.

-- Lets child tables prove they belong to the same organization as their parent (composite FKs).
alter table public.business_profiles add constraint business_profiles_id_org_key unique (id, organization_id);

create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_profile_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'discovering'
    check (status in ('discovering', 'reviewing', 'completed', 'skipped')),
  catalog_version integer not null,
  evidence_job_id uuid references public.ai_jobs(id) on delete set null,
  plan_job_id uuid references public.ai_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, organization_id),
  foreign key (business_profile_id, organization_id)
    references public.business_profiles(id, organization_id) on delete cascade
);
create index onboarding_sessions_org_idx on public.onboarding_sessions(organization_id);
create index onboarding_sessions_profile_idx on public.onboarding_sessions(business_profile_id, created_at desc);
create index onboarding_sessions_evidence_job_idx on public.onboarding_sessions(evidence_job_id);
create index onboarding_sessions_plan_job_idx on public.onboarding_sessions(plan_job_id);

create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  session_id uuid not null,
  -- 'pain_point' = a catalog pain point; 'statement' = the owner's own words (free text).
  kind text not null check (kind in ('pain_point', 'statement')),
  pain_point_id text,
  -- owner_selected = picked by the owner; ai_suggested = mapped by AI from a statement.
  source text not null check (source in ('owner_selected', 'ai_suggested')),
  confirmed boolean not null default false,
  original_text text check (original_text is null or char_length(original_text) <= 1000),
  ai_confidence text check (ai_confidence is null or ai_confidence in ('high', 'medium', 'low')),
  customer_priority smallint check (customer_priority is null or customer_priority between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, organization_id)
    references public.onboarding_sessions(id, organization_id) on delete cascade,
  check ((kind = 'pain_point') = (pain_point_id is not null)),
  check (kind = 'pain_point' or source = 'owner_selected')
);
create index onboarding_responses_org_idx on public.onboarding_responses(organization_id);
create index onboarding_responses_session_idx on public.onboarding_responses(session_id);
create unique index onboarding_responses_session_pain_point_key
  on public.onboarding_responses(session_id, pain_point_id) where pain_point_id is not null;
create unique index onboarding_responses_session_priority_key
  on public.onboarding_responses(session_id, customer_priority) where customer_priority is not null;

alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_responses enable row level security;

create policy "members all" on public.onboarding_sessions for all to authenticated
  using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy "members all" on public.onboarding_responses for all to authenticated
  using (public.is_member(organization_id)) with check (public.is_member(organization_id));

-- Job links are set by trusted server code only.
-- (This column-level revoke is ineffective while the table-level grant exists; fixed in
-- 20261010155931_onboarding_sessions_column_grants.sql.)
revoke update (evidence_job_id, plan_job_id) on public.onboarding_sessions from authenticated;

create trigger touch_updated_at before update on public.onboarding_sessions
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.onboarding_responses
  for each row execute function public.touch_updated_at();

comment on table public.onboarding_sessions is 'One AI-assisted onboarding run per business profile (ON-1 – ON-8, D-028).';
comment on table public.onboarding_responses is 'Owner answers: catalog pain points (selected or AI-suggested and confirmed), own-words statements, top-three priorities. Customer-provided once confirmed.';
