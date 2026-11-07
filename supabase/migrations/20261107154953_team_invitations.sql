-- Team invitations and the team audit log (founder decision D-046; docs/architecture/ROLES_AND_PERMISSIONS.md §8).
--
-- 1. team_invitations: one row per invite link. The link's token is shown once; only its SHA-256 is stored. The server
--    writes every row with the secret key after checking team.manage in app code (app/settings/team-actions.ts), the
--    same pattern as the OAuth tables. People who hold team.manage in the business read its invitations, never the
--    hash (column grants). An invite is for one email address and one role, never owner or client approver.
-- 2. team_events: append-only record of invites, revoked invites, joins, role changes and removals
--    (SECURITY_AND_PRIVACY.md §11). Written by the server only; readable by people who hold team.manage.
--
-- Joining, role changes and removals write memberships with the secret key, so memberships_owner_guard doesn't see
-- them; the app never gives or changes the owner role (canManageRole in web/src/lib/team/roles.ts) and the role check
-- below keeps owner out of invitations.

-- 1. Invitations -----------------------------------------------------------------------------------------------
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email) and length(email) between 3 and 320),
  role public.member_role not null check (role not in ('owner', 'client_approver')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);
create index team_invitations_org_idx on public.team_invitations(organization_id);
create index team_invitations_invited_by_idx on public.team_invitations(invited_by);
create index team_invitations_accepted_by_idx on public.team_invitations(accepted_by);
-- One open invite per address per business; inviting the same address again revokes the old link first.
create unique index team_invitations_one_open on public.team_invitations(organization_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.team_invitations enable row level security;
create policy "team managers read invitations" on public.team_invitations
  for select to authenticated using (public.has_permission(organization_id, 'team.manage'));
revoke all on public.team_invitations from anon, authenticated;
grant select (id, organization_id, email, role, invited_by, created_at, expires_at, accepted_at, accepted_by, revoked_at)
  on public.team_invitations to authenticated;

-- 2. Audit log -------------------------------------------------------------------------------------------------
create table public.team_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('invited', 'invite_revoked', 'joined', 'role_changed', 'removed')),
  subject_email text,
  subject_user_id uuid references auth.users(id) on delete set null,
  role_from public.member_role,
  role_to public.member_role,
  created_at timestamptz not null default now()
);
create index team_events_org_idx on public.team_events(organization_id, created_at desc);
create index team_events_actor_idx on public.team_events(actor_id);
create index team_events_subject_idx on public.team_events(subject_user_id);

alter table public.team_events enable row level security;
create policy "team managers read team events" on public.team_events
  for select to authenticated using (public.has_permission(organization_id, 'team.manage'));
revoke all on public.team_events from anon, authenticated;
grant select on public.team_events to authenticated;
