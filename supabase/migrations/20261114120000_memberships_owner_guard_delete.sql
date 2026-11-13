-- The owner guard covers removing an owner too (D-044, D-046; docs/architecture/ROLES_AND_PERMISSIONS.md §1 and §7).
--
-- Not applied yet: written 2026-11-14 and waiting for the founder's yes. When it is applied, this file is renamed to the
-- version Supabase assigns, like the other migrations here.
--
-- memberships_owner_guard (20261017030000_mcp_oauth.sql) fired before insert or update only, and "admins delete
-- memberships" (20261010061126_advisor_fixes.sql) lets anyone is_org_admin() (owner, admin, platform staff) delete any
-- membership of the business with the publishable key. So an admin could delete the owner's membership: the business
-- is left with no owner, so no one holds organization.delete, integrations.connect or keys.manage_any, and the owner
-- loses it from their account. The app's rule is that no one manages an owner (canManageRole in
-- web/src/lib/team/roles.ts).
--
-- 1. The guard also fires before delete. A signed-in client may delete an owner membership only as an owner of that
--    business, the same rule as changing one.
-- 2. A signed-in client can't take away a business's last owner: deleting the only owner membership, or changing it to
--    another role or business, is refused. Refusing the delete alone would leave the same result one update away. The
--    check reads memberships as the caller, who is by then an owner of the business, so "members read memberships"
--    shows every row of it (a hidden row could only make it refuse). It isn't locked: two owners removing each other
--    in concurrent transactions could both get through. The app never makes a second owner (only create_organization()
--    makes owners), so a business has one unless an owner adds another through the Data API.
-- 3. The function ends with return coalesce(new, old). new is null in a delete trigger, and a BEFORE trigger that
--    returns null silently skips the row, so returning new would cancel every delete, the cascades below included.
--
-- The guard acts only when current_user is `authenticated`, so nothing that runs as another role is affected:
-- - The app's own membership writes (joining in app/invite/[token]/actions.ts; role changes and removals in
--   app/settings/team-actions.ts) use the secret key and run as service_role.
-- - create_organization() is security definer.
-- - Deleting an organization (Remove business, D-061) or an auth.users row cascades to memberships. Postgres runs a
--   foreign key's cascade as the owner of the referencing table, not as the caller (the same reason
--   20261107224152_user_deletion_foreign_keys.sql gives for the content guard), so the cascade still deletes every
--   membership, owners included. organizations has no delete policy, so a client can't start that cascade itself.
--
-- create or replace trigger (Postgres 14+) swaps the trigger in place, without a drop statement for the Supabase MCP
-- tool's destructive-statement guard to refuse (20261023092945_roles_and_permissions.sql).

create or replace function public.memberships_owner_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    -- Making an owner, or changing an owner's membership (its role, user or organization): owners only. Unchanged.
    if tg_op in ('INSERT', 'UPDATE')
       and (new.role = 'owner' or (tg_op = 'UPDATE' and old.role = 'owner'))
       and (tg_op = 'INSERT' or new is distinct from old)
       and not (public.is_org_owner(new.organization_id) and (tg_op = 'INSERT' or public.is_org_owner(old.organization_id))) then
      raise exception 'Only an owner can make someone an owner or change an owner''s membership.' using errcode = '42501';
    end if;
    -- Removing an owner: owners only.
    if tg_op = 'DELETE' and old.role = 'owner' and not public.is_org_owner(old.organization_id) then
      raise exception 'Only an owner can remove an owner from a business.' using errcode = '42501';
    end if;
    -- The last owner stays.
    if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner'
       and (tg_op = 'DELETE' or new.role <> 'owner' or new.organization_id <> old.organization_id)
       and not exists (
         select 1 from public.memberships m
         where m.organization_id = old.organization_id and m.role = 'owner' and m.user_id <> old.user_id
       ) then
      raise exception 'A business needs an owner. Make someone else an owner first, or remove the business in Settings.' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
-- create or replace keeps the grants; restated so this file reads complete. Only the trigger calls it.
revoke all on function public.memberships_owner_guard() from public, anon, authenticated;

create or replace trigger memberships_owner_guard before insert or update or delete on public.memberships
  for each row execute function public.memberships_owner_guard();
