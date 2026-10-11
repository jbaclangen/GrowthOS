-- Subscription tiers and the 14-day Pro trial (D-030). No billing yet: the effective tier is computed in code
-- (web/src/lib/plans/tiers.ts) from organizations.plan and trial_ends_at.

-- Tiers: trial (Pro features for 14 days, then Basic), basic, pro, premium (custom).
update public.organizations set plan = 'trial' where plan is null or plan not in ('trial', 'basic', 'pro', 'premium');
alter table public.organizations
  add constraint organizations_plan_check check (plan in ('trial', 'basic', 'pro', 'premium'));

-- Existing organizations get 14 days from when they were created; new ones from now.
alter table public.organizations add column trial_ends_at timestamptz;
update public.organizations set trial_ends_at = created_at + interval '14 days' where trial_ends_at is null;
alter table public.organizations alter column trial_ends_at set default (now() + interval '14 days');
alter table public.organizations alter column trial_ends_at set not null;

-- Security fix: org admins could update every column, including plan, trial_ends_at and monthly_ai_budget_usd.
-- Owners may rename their organization; plan, trial and budget change only through trusted server code.
revoke update on public.organizations from authenticated, anon;
grant update (name, slug) on public.organizations to authenticated;

-- "Talk to us" requests from the plans page while there is no billing (D-030). The founder reads these in Supabase.
create table public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null default auth.uid(),
  tier text not null check (tier in ('pro', 'premium')),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'open' check (status in ('open', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
create index upgrade_requests_org_idx on public.upgrade_requests(organization_id);
create index upgrade_requests_requested_by_idx on public.upgrade_requests(requested_by);

alter table public.upgrade_requests enable row level security;
create policy "members read" on public.upgrade_requests for select to authenticated
  using (public.is_member(organization_id));
create policy "members insert" on public.upgrade_requests for insert to authenticated
  with check (public.is_member(organization_id) and requested_by = (select auth.uid()));
revoke insert, update, delete on public.upgrade_requests from authenticated, anon;
grant insert (organization_id, tier, message) on public.upgrade_requests to authenticated;

comment on column public.organizations.trial_ends_at is 'End of the 14-day Pro trial (D-030). After it, a "trial" organization is on Basic.';
comment on table public.upgrade_requests is 'Requests to move to Pro or Premium while billing is not available (D-030).';
