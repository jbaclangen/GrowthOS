-- AI-assisted onboarding, stage 3 (ON-7, ON-8, D-028; delivers MS-5 and UX-1 per D-022):
-- a diagnosis the owner confirms or corrects, and one prioritized plan replacing the "5 opportunities".
-- Rows are written by the pipeline (admin client). Owners may only update their review and status fields.

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_profile_id uuid not null,
  report_id uuid references public.reports(id) on delete set null,
  job_id uuid references public.ai_jobs(id) on delete set null,
  -- The diagnosis this one corrects (owner corrections → re-run of the diagnosis step).
  revises_id uuid references public.diagnoses(id) on delete set null,
  version integer not null default 1,
  summary text not null check (char_length(summary) <= 1500),
  missing_info text[] not null default '{}',
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'superseded')),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (business_profile_id, organization_id)
    references public.business_profiles(id, organization_id) on delete cascade
);
create index diagnoses_org_idx on public.diagnoses(organization_id);
create index diagnoses_profile_idx on public.diagnoses(business_profile_id, created_at desc);
create index diagnoses_report_idx on public.diagnoses(report_id);
create index diagnoses_job_idx on public.diagnoses(job_id);
create index diagnoses_revises_idx on public.diagnoses(revises_id);
create index diagnoses_confirmed_by_idx on public.diagnoses(confirmed_by);

create table public.diagnosis_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  diagnosis_id uuid not null,
  position smallint not null check (position between 1 and 10),
  statement text not null check (char_length(statement) <= 600),
  evidence text not null check (char_length(evidence) <= 800),
  -- Provenance class (D-028): verified = website or PageSpeed; customer_provided = the owner said so;
  -- inferred = the model's reasoning.
  provenance text not null check (provenance in ('verified', 'customer_provided', 'inferred')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  pain_point_ids text[] not null default '{}',
  owner_verdict text not null default 'pending' check (owner_verdict in ('pending', 'confirmed', 'rejected')),
  owner_note text check (owner_note is null or char_length(owner_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (diagnosis_id, position),
  foreign key (diagnosis_id, organization_id)
    references public.diagnoses(id, organization_id) on delete cascade
);
create index diagnosis_findings_org_idx on public.diagnosis_findings(organization_id);

create table public.growth_plan_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  diagnosis_id uuid not null,
  title text not null check (char_length(title) <= 300),
  area text not null default '',
  pain_point_ids text[] not null default '{}',
  -- Positions of the findings this item addresses.
  finding_positions smallint[] not null default '{}',
  why text not null default '',
  evidence text not null default '',
  first_action text not null default '',
  dependencies text not null default '',
  success_metric text not null default '',
  solution_ids text[] not null default '{}',
  manual_alternative text not null default '',
  impact smallint not null check (impact between 1 and 5),
  urgency smallint not null check (urgency between 1 and 5),
  urgency_from_owner boolean not null default false,
  effort smallint not null check (effort between 1 and 5),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  -- Four separate priorities (spec §7): the owner's, the model's ranking, the score computed in code,
  -- and the order the owner confirmed.
  customer_priority smallint check (customer_priority is null or customer_priority between 1 and 3),
  ai_priority smallint not null check (ai_priority between 1 and 20),
  calculated_priority numeric(6, 1) not null,
  final_priority smallint check (final_priority is null or final_priority between 1 and 20),
  -- MS-5: proposed (open) → accepted / dismissed / done.
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'dismissed', 'done')),
  status_changed_at timestamptz,
  status_changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (diagnosis_id, organization_id)
    references public.diagnoses(id, organization_id) on delete cascade
);
create index growth_plan_items_org_idx on public.growth_plan_items(organization_id);
create index growth_plan_items_diagnosis_idx on public.growth_plan_items(diagnosis_id);
create index growth_plan_items_changed_by_idx on public.growth_plan_items(status_changed_by);

alter table public.diagnoses enable row level security;
alter table public.diagnosis_findings enable row level security;
alter table public.growth_plan_items enable row level security;

create policy "members read" on public.diagnoses for select to authenticated using (public.is_member(organization_id));
create policy "members update" on public.diagnoses for update to authenticated
  using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy "members read" on public.diagnosis_findings for select to authenticated using (public.is_member(organization_id));
create policy "members update" on public.diagnosis_findings for update to authenticated
  using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy "members read" on public.growth_plan_items for select to authenticated using (public.is_member(organization_id));
create policy "members update" on public.growth_plan_items for update to authenticated
  using (public.is_member(organization_id)) with check (public.is_member(organization_id));

-- Owners change only their review and status fields; everything else comes from the pipeline.
revoke insert, update, delete on public.diagnoses, public.diagnosis_findings, public.growth_plan_items from authenticated, anon;
grant update (status, confirmed_at, confirmed_by) on public.diagnoses to authenticated;
grant update (owner_verdict, owner_note) on public.diagnosis_findings to authenticated;
grant update (status, status_changed_at, status_changed_by, final_priority) on public.growth_plan_items to authenticated;

create trigger touch_updated_at before update on public.diagnoses
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.diagnosis_findings
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.growth_plan_items
  for each row execute function public.touch_updated_at();

comment on table public.diagnoses is 'What is holding the business back, synthesised from the owner''s answers and website evidence; the owner confirms or corrects it (ON-7).';
comment on table public.diagnosis_findings is 'One finding with its provenance class, confidence and the owner''s verdict (ON-7).';
comment on table public.growth_plan_items is 'The single prioritized plan (ON-8) with owner / AI / calculated / final priority and MS-5 status.';
