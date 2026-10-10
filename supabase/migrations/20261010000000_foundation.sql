-- GrowthOS foundation schema (Sprint 1)
-- Every customer-facing table carries organization_id and is isolated with RLS.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'trial',
  monthly_ai_budget_usd numeric(10, 2) not null default 5,
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'admin', 'member');

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- Platform staff (you) can see every tenant from the admin view.
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- SECURITY DEFINER helpers so RLS policies don't recurse through memberships.
create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.platform_admins p where p.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  ) or exists (
    select 1 from public.platform_admins p where p.user_id = (select auth.uid())
  );
$$;

-- Creates an org and makes the caller its owner in one step.
create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  insert into public.organizations (name) values (org_name) returning id into new_id;
  insert into public.memberships (organization_id, user_id, role)
    values (new_id, (select auth.uid()), 'owner');
  return new_id;
end;
$$;
revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Business intelligence
-- ---------------------------------------------------------------------------
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  website_url text,
  industry text,
  services text[] not null default '{}',
  target_customers text,
  locations text[] not null default '{}',
  competitors text[] not null default '{}',
  offers text,
  goals text,
  intelligence jsonb not null default '{}'::jsonb, -- structured Business Intelligence Profile
  growth_score int check (growth_score between 0 and 100),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_profiles_org_idx on public.business_profiles(organization_id);

create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete cascade,
  voice text,
  tone_rules text[] not null default '{}',
  messaging_pillars text[] not null default '{}',
  visual_guidelines jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brand_profiles_org_idx on public.brand_profiles(organization_id);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null, -- website_page | upload | note | crm
  source_url text,
  title text,
  content text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, content_hash)
);
create index knowledge_documents_org_idx on public.knowledge_documents(organization_id);

create table public.knowledge_chunks (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);
create index knowledge_chunks_org_idx on public.knowledge_chunks(organization_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- RLS-respecting similarity search for the AI Marketing Assistant.
create or replace function public.match_knowledge(
  org uuid, query_embedding extensions.vector(1536), match_count int default 8
)
returns table (id bigint, document_id uuid, content text, similarity float)
language sql stable set search_path = '' as $$
  select c.id, c.document_id, c.content,
         1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.knowledge_chunks c
  where c.organization_id = org and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Content engine
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  objective text,
  status text not null default 'planned', -- planned | active | complete
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);
create index campaigns_org_idx on public.campaigns(organization_id);

create table public.content_calendars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  strategy jsonb not null default '{}'::jsonb,
  starts_on date not null,
  days int not null default 30,
  created_at timestamptz not null default now()
);
create index content_calendars_org_idx on public.content_calendars(organization_id);

create type public.content_status as enum
  ('brief', 'draft', 'in_qa', 'needs_approval', 'approved', 'scheduled', 'published', 'rejected');

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  calendar_id uuid references public.content_calendars(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel text not null, -- facebook | instagram | linkedin | blog | email | video_script ...
  content_type text not null, -- caption | article | cta | image_prompt | script | email
  scheduled_for timestamptz,
  title text,
  brief text,
  body text,
  qa_notes jsonb,
  status public.content_status not null default 'brief',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_items_org_idx on public.content_items(organization_id);
create index content_items_calendar_idx on public.content_items(calendar_id);

-- ---------------------------------------------------------------------------
-- Integrations, AI jobs and usage
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null, -- hubspot | wordpress | google_analytics | search_console | stripe ...
  status text not null default 'pending', -- pending | connected | error | revoked
  external_account_id text,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  -- Tokens live in Supabase Vault; only the secret's id is stored here.
  vault_secret_id uuid,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed');

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  worker text not null, -- business_analyst | content_writer | qa_reviewer ...
  task_class text not null, -- simple | standard | complex | qa
  status public.job_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  n8n_execution_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index ai_jobs_org_idx on public.ai_jobs(organization_id, created_at desc);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid references public.ai_jobs(id) on delete set null,
  worker text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_org_month_idx on public.ai_usage(organization_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_type text not null, -- website_audit | growth_plan | crm_summary
  title text not null,
  summary text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index reports_org_idx on public.reports(organization_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'trial',
  status text not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;

create policy "members read org" on public.organizations
  for select to authenticated using (public.is_member(id));
create policy "admins update org" on public.organizations
  for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "members read memberships" on public.memberships
  for select to authenticated using (public.is_member(organization_id));
create policy "admins manage memberships" on public.memberships
  for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "admins read self" on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Tenant tables members can read and write.
do $$
declare t text;
begin
  foreach t in array array[
    'business_profiles', 'brand_profiles', 'knowledge_documents', 'knowledge_chunks',
    'campaigns', 'content_calendars', 'content_items', 'ai_jobs', 'reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members all" on public.%I for all to authenticated
         using (public.is_member(organization_id)) with check (public.is_member(organization_id))', t);
  end loop;
end $$;

-- Read-only for members; written only by the server (secret key) or webhooks.
do $$
declare t text;
begin
  foreach t in array array['integrations', 'ai_usage', 'subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members read" on public.%I for select to authenticated
         using (public.is_member(organization_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['business_profiles', 'brand_profiles', 'content_items', 'subscriptions'] loop
    execute format(
      'create trigger touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Month-to-date AI spend per org, used for budget enforcement.
create or replace view public.ai_spend_mtd with (security_invoker = true) as
select organization_id, sum(cost_usd) as cost_usd, sum(input_tokens + output_tokens) as tokens
from public.ai_usage
where created_at >= date_trunc('month', now())
group by organization_id;
