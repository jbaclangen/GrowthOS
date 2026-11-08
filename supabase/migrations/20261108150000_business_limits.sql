-- Several businesses per account, up to a limit set by the plan, and one trial per account (D-062;
-- docs/product/PLANS_AND_TIERS.md §2a, docs/architecture/ROLES_AND_PERMISSIONS.md §10). Not applied yet: applying it
-- needs the founder's yes.
--
-- An account is a person (auth.users). The businesses it owns are the organizations where its membership role is
-- owner. The same rules live in web/src/lib/plans/business-limit.ts; business-limit.test.ts checks the numbers here
-- against it.
--
-- 1. account_trials: one row per account that has started the 14-day Pro trial, with when it ends. Not tenant data
--    (it belongs to the person, not to a business, and outlives the businesses it was used on), so its RLS is keyed
--    to the user instead of is_member(): a person reads only their own row; only create_organization() (security
--    definer) and the service role write.
-- 2. account_business_limit(uid): Basic 2, Pro 4, Premium 8, from the highest plan any business the account owns is
--    on right now (an active trial counts as Pro); Basic's with none.
-- 3. create_organization(): refuses a new business once the account owns as many as its limit (SQLSTATE BRV01, read by
--    web/src/lib/organizations/create.ts), and decides the new business's plan: the account's highest plan when one of
--    its businesses is on a plan; otherwise the account's trial, started now if it never had one, or its end date
--    (possibly past, so effective Basic) if it did. Deleting a business and scanning again doesn't restart the trial.
--    A per-account advisory lock makes two creates at once count each other.

-- 1. account_trials ----------------------------------------------------------------------------------------------
create table public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null
);

alter table public.account_trials enable row level security;
create policy "users read their own trial" on public.account_trials for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.account_trials from anon, authenticated;
grant select on public.account_trials to authenticated;

-- Every account that owns a business today has used its trial: every organization so far started on one (D-030).
-- Its window is the one its oldest owned business had.
insert into public.account_trials (user_id, started_at, ends_at)
select distinct on (m.user_id) m.user_id, o.created_at, o.trial_ends_at
from public.memberships m
join public.organizations o on o.id = m.organization_id
where m.role = 'owner'
order by m.user_id, o.created_at
on conflict (user_id) do nothing;

comment on table public.account_trials is
  'The one 14-day Pro trial each account gets (D-062). Written only by create_organization() and the service role.';

-- 2. account_business_limit ----------------------------------------------------------------------------------------
create or replace function public.account_business_limit(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select case coalesce(max(
      case
        when o.plan = 'premium' then 3
        when o.plan = 'pro' then 2
        when o.plan = 'trial' and o.trial_ends_at > now() then 2
        else 1
      end), 1)
    when 3 then 8
    when 2 then 4
    else 2
  end
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = uid and m.role = 'owner';
$$;
revoke all on function public.account_business_limit(uuid) from public, anon, authenticated;

-- 3. create_organization -------------------------------------------------------------------------------------------
create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  owned integer;
  max_businesses integer;
  paid_plan text;
  trial_end timestamptz;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Two creates at once for the same account wait for each other, so both can't pass the count.
  perform pg_advisory_xact_lock(hashtextextended('create_organization:' || uid::text, 0));

  select count(*) into owned from public.memberships where user_id = uid and role = 'owner';
  max_businesses := public.account_business_limit(uid);
  if owned >= max_businesses then
    raise exception 'This account already has % businesses, the most its plan includes.', max_businesses
      using errcode = 'BRV01', detail = format('%s of %s', owned, max_businesses);
  end if;

  select o.plan into paid_plan
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = uid and m.role = 'owner' and o.plan in ('basic', 'pro', 'premium')
  order by case o.plan when 'premium' then 3 when 'pro' then 2 else 1 end desc
  limit 1;

  if paid_plan is not null then
    insert into public.organizations (name, plan, trial_ends_at) values (org_name, paid_plan, now())
      returning id into new_id;
  else
    select ends_at into trial_end from public.account_trials where user_id = uid;
    if trial_end is null then
      trial_end := now() + interval '14 days';
      insert into public.account_trials (user_id, ends_at) values (uid, trial_end);
    end if;
    insert into public.organizations (name, plan, trial_ends_at) values (org_name, 'trial', trial_end)
      returning id into new_id;
  end if;

  insert into public.memberships (organization_id, user_id, role) values (new_id, uid, 'owner');
  return new_id;
end;
$$;
-- create or replace keeps the grants; restated so this file reads complete.
revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
