-- Guard content approval against direct Data API writes (SECURITY_AND_PRIVACY.md §2, D-018).
--
-- The "members all" policy on content_items lets any member write any column with the publishable key,
-- so a client could set status = 'published' or record someone else as approver. This trigger limits
-- what signed-in users (the `authenticated` role) can do; server code using the secret key
-- (`service_role`, e.g. the pipeline) is not restricted.
--
-- For `authenticated`:
--   * Inserts start as 'brief' or 'draft' with no approver.
--   * Status changes only between needs_approval, approved and rejected (the approve / reject / undo
--     actions). Nothing else — in particular not scheduled or published — can be set from a client.
--   * approved_by / approved_at are always derived: auth.uid() and now() when an item becomes approved,
--     unchanged while it stays approved, cleared otherwise. Whatever the client sends is ignored.

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
    new.approved_by := null;
    new.approved_at := null;
    return new;
  end if;

  if new.status is distinct from old.status
     and not (old.status in ('needs_approval', 'approved', 'rejected')
              and new.status in ('needs_approval', 'approved', 'rejected')) then
    raise exception 'Content status can''t change from % to %', old.status, new.status using errcode = '42501';
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

revoke execute on function public.guard_content_item_write() from public, anon, authenticated;

create trigger guard_content_item_write
  before insert or update on public.content_items
  for each row execute function public.guard_content_item_write();
