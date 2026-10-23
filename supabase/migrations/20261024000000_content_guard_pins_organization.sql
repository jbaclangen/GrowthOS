-- The approval guard pins a content item to its business (D-046 review of PR #46).
--
-- guard_content_item_write (20261023092945_roles_and_permissions.sql) checks content.approve and content.approve_own
-- against old.organization_id. The "members all" RLS policy lets a member rewrite organization_id to any business they
-- belong to, and create_organization() makes anyone the owner of a business of their own. So a member without
-- content.approve could move a draft into their own business, approve it there and move it back. No app path changes
-- content_items.organization_id and the pipeline writes with the service role (unaffected: the guard returns early), so
-- a client change of organization_id is refused outright. Otherwise the function is unchanged.

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

  -- Content stays in its business; moving it would carry it past the permission checks below.
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Content can''t move to another business' using errcode = '42501';
  end if;

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
