-- Removing a business (D-061; docs/architecture/ROLES_AND_PERMISSIONS.md §9).
--
-- 1. has_permission(org, perm) gains 'organization.delete' (owner only), so the SQL matrix stays equal to
--    web/src/lib/team/roles.ts. web/src/lib/team/migration.test.ts compares the newest definition of the function with
--    can(). Nothing in SQL checks the permission yet: the delete runs in trusted server code (app/settings/
--    remove-business-actions.ts) after it revokes the Google and HubSpot tokens, and organizations keeps having no
--    delete policy, so a client can't skip that step by deleting the row with the publishable key.
-- 2. organization_deletions: one row per removed business, written by the server with the secret key after the
--    delete. It is not tenant data (the organization is gone, so it can't reference it or cascade with it) and holds
--    no personal data: no user, email, business name or website, only the deleted organization's id, its plan and
--    age, how many members it had and whether the external tokens were revoked. RLS on with no policies and every
--    privilege revoked from anon and authenticated: service role only, like oauth_clients.

-- 1. has_permission ----------------------------------------------------------------------------------------------
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
          when 'organization.delete' then array['owner']
          else array[]::text[]
        end
      )
  );
$$;
-- create or replace keeps the grants; restated so this file reads complete.
revoke all on function public.has_permission(uuid, text) from public, anon;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- 2. organization_deletions --------------------------------------------------------------------------------------
create table public.organization_deletions (
  id bigint generated always as identity primary key,
  -- The removed organization's id. No foreign key: the row it named no longer exists.
  organization_id uuid not null,
  plan text not null check (plan in ('trial', 'basic', 'pro', 'premium')),
  organization_created_at timestamptz not null,
  members integer not null check (members >= 0),
  -- What happened to the external tokens before the delete: none stored, revoked, or the revoke failed or couldn't
  -- be confirmed (the token was deleted with the business either way).
  google_revoke text not null check (google_revoke in ('none', 'revoked', 'failed')),
  hubspot_revoke text not null check (hubspot_revoke in ('none', 'revoked', 'failed')),
  deleted_at timestamptz not null default now()
);
create index organization_deletions_deleted_at_idx on public.organization_deletions(deleted_at desc);

alter table public.organization_deletions enable row level security;
revoke all on public.organization_deletions from anon, authenticated;

comment on table public.organization_deletions is
  'One row per business removed from Settings (D-061). No personal data. Written by the server with the secret key only.';
