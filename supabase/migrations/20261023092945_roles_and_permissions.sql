-- Roles and permissions foundation (founder decision D-046; docs/architecture/ROLES_AND_PERMISSIONS.md).
--
-- 1. member_role gets the eight fixed roles. Postgres can't drop an enum value, so the type is replaced: the old type
--    is renamed, the column converted (member becomes analyst, the least privilege) and the old type dropped in the
--    next migration (the Supabase MCP tool refuses a drop inside a larger statement block).
--    is_member(), is_org_admin() (owner or admin) and is_org_owner() keep working: their bodies compare role text.
-- 2. has_permission(org, perm): the matrix web/src/lib/team/roles.ts holds, for triggers and later RLS write
--    policies. Security definer with a pinned search_path and execute for authenticated only, like is_member(), and
--    no platform-staff bypass. web/src/lib/team/migration.test.ts parses the case below and compares it with can().
-- 3. content_items.created_by: the author, set by the approval guard on client inserts. The guard now also enforces
--    who may approve (D-046): content.approve for a status change, content.approve_own (owner only) for one's own
--    draft. The approver stays database-set (D-018).
--
-- Applied to the Supabase project 2026-10-23 as version 20261023092945. The follow-up statement
-- `drop type public.member_role_v1;` was refused by the tool's destructive-statement guard and is still pending:
-- run it from the SQL editor (the type is unused; nothing depends on it).

-- 1. Roles -------------------------------------------------------------------------------------------------------
alter type public.member_role rename to member_role_v1;
create type public.member_role as enum (
  'owner', 'admin', 'marketing_manager', 'social_media_manager', 'copywriter', 'content_creator', 'analyst', 'client_approver'
);
alter table public.memberships alter column role drop default;
alter table public.memberships
  alter column role type public.member_role
  using (case role::text when 'member' then 'analyst' else role::text end)::public.member_role;
alter table public.memberships alter column role set default 'analyst';

-- 2. has_permission ----------------------------------------------------------------------------------------------
create or replace function public.has_permission(org uuid, perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
      and m.role::text = any (
        case perm
          when 'billing.view' then array['owner', 'admin']
          when 'billing.manage' then array['owner']
          when 'team.manage' then array['owner', 'admin']
          when 'integrations.connect' then array['owner']
          when 'keys.manage_own' then array['owner', 'admin', 'marketing_manager', 'social_media_manager']
          when 'keys.manage_any' then array['owner']
          when 'profile.edit' then array['owner', 'admin', 'marketing_manager']
          when 'analysis.run' then array['owner', 'admin', 'marketing_manager']
          when 'diagnosis.correct' then array['owner', 'admin', 'marketing_manager']
          when 'plan_items.update_own' then array['owner', 'admin', 'marketing_manager', 'social_media_manager', 'copywriter', 'content_creator']
          when 'plan_items.update_any' then array['owner', 'admin', 'marketing_manager']
          when 'content.draft' then array['owner', 'admin', 'marketing_manager', 'social_media_manager', 'copywriter', 'content_creator']
          when 'content.approve' then array['owner', 'admin', 'marketing_manager']
          when 'content.approve_own' then array['owner']
          when 'reports.view' then array['owner', 'admin', 'marketing_manager', 'social_media_manager', 'analyst']
          when 'reports.export' then array['owner', 'admin', 'marketing_manager', 'analyst']
          when 'assistant.use' then array['owner', 'admin', 'marketing_manager', 'social_media_manager', 'copywriter', 'content_creator', 'analyst']
          else array[]::text[]
        end
      )
  );
$$;
revoke all on function public.has_permission(uuid, text) from public, anon;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- 3. Authorship and who may approve ------------------------------------------------------------------------------
alter table public.content_items add column created_by uuid references auth.users(id) on delete set null;
create index content_items_created_by_idx on public.content_items(created_by);
comment on column public.content_items.created_by is
  'The person who wrote the draft; null for drafts the pipeline writes. Set by guard_content_item_write on client inserts, never by the client (D-046).';

-- Replaces 20261010121043_content_approval_guard.sql's function; the trigger and its grants stay.
create or replace function public.guard_content_item_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('brief', 'draft') then
      raise exception 'New content must start as a brief or draft' using errcode = '42501';
    end if;
    new.created_by := (select auth.uid());
    new.approved_by := null;
    new.approved_at := null;
    return new;
  end if;

  -- The author is set once; a client can't claim or hide authorship.
  new.created_by := old.created_by;

  if new.status is distinct from old.status
     and not (old.status in ('needs_approval', 'approved', 'rejected')
              and new.status in ('needs_approval', 'approved', 'rejected')) then
    raise exception 'Content status can''t change from % to %', old.status, new.status using errcode = '42501';
  end if;

  -- D-046: approving, rejecting and undoing need content.approve; approving one's own draft needs content.approve_own.
  if new.status is distinct from old.status then
    if not public.has_permission(old.organization_id, 'content.approve') then
      raise exception 'Your role in this business can''t approve or reject drafts' using errcode = '42501';
    end if;
    if new.status = 'approved' and old.created_by is not null and old.created_by = (select auth.uid())
       and not public.has_permission(old.organization_id, 'content.approve_own') then
      raise exception 'You can''t approve your own draft. Ask another approver' using errcode = '42501';
    end if;
  end if;

  if new.status = 'approved' then
    if old.status = 'approved' then
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
    else
      new.approved_by := (select auth.uid());
      new.approved_at := now();
    end if;
  else
    new.approved_by := null;
    new.approved_at := null;
  end if;

  return new;
end;
$$;
