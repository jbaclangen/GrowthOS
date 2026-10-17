-- AI assistant connection (MCP), phase 2: OAuth 2.1 sign-in for claude.ai, Claude Desktop/Code connectors and ChatGPT,
-- plus organization-level service keys for automation (n8n, Zapier, scripts). See docs/architecture/MCP_SERVER.md.
--
-- Secrets (authorization codes, access and refresh tokens, keys) are random values shown once and stored only as
-- SHA-256 hashes. Every OAuth table is written by the server with the service client only; members can read the
-- non-secret columns of their organization's grants (column grants, never a hash) so Settings can list connected apps.

-- Owner check for RLS, without recursing through memberships' own policies (same pattern as is_org_admin).
create or replace function public.is_org_owner(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;
revoke all on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- OAuth clients (RFC 7591 dynamic client registration). Global, not tenant data: ChatGPT or claude.ai register once
-- per connector. No client policies: only the service role reads or writes them.
create table public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique check (client_id ~ '^brv_client_[A-Za-z0-9_-]{22,64}$'),
  -- Only for confidential clients (token_endpoint_auth_method client_secret_post/basic). SHA-256 hex.
  client_secret_hash text check (client_secret_hash is null or client_secret_hash ~ '^[0-9a-f]{64}$'),
  token_endpoint_auth_method text not null default 'none'
    check (token_endpoint_auth_method in ('none', 'client_secret_post', 'client_secret_basic')),
  client_name text not null check (char_length(client_name) between 1 and 100),
  client_uri text check (client_uri is null or char_length(client_uri) <= 300),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 10),
  -- HMAC of the registering IP with a server-side key; used only to rate-limit registrations. The IP isn't stored.
  registration_ip_hash text check (registration_ip_hash is null or char_length(registration_ip_hash) = 64),
  created_at timestamptz not null default now()
);
create index oauth_clients_ip_time_idx on public.oauth_clients(registration_ip_hash, created_at desc);
create index oauth_clients_created_idx on public.oauth_clients(created_at desc);
alter table public.oauth_clients enable row level security;
revoke all on public.oauth_clients from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- A grant: one owner's or member's approval for one client to act on one organization. Access and refresh tokens
-- belong to a grant (their "family"). Disconnecting in Settings revokes the grant and every token in it; refresh-token
-- reuse does the same.
create table public.oauth_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  client_name text not null check (char_length(client_name) between 1 and 100),
  scopes text[] not null check (cardinality(scopes) between 1 and 10),
  resource text not null check (char_length(resource) <= 300),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason is null or revoked_reason in ('user', 'refresh_reuse', 'code_reuse', 'membership'))
);
create index oauth_grants_org_idx on public.oauth_grants(organization_id, created_at desc);
create index oauth_grants_user_idx on public.oauth_grants(user_id);
create index oauth_grants_client_idx on public.oauth_grants(client_id);
alter table public.oauth_grants enable row level security;
create policy "members read" on public.oauth_grants for select to authenticated
  using (public.is_member(organization_id));
revoke all on public.oauth_grants from anon, authenticated;
grant select (id, organization_id, user_id, client_name, scopes, created_at, last_used_at, revoked_at)
  on public.oauth_grants to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Authorization codes: one-time, 10 minutes, bound to client, redirect URI, PKCE challenge, user, organization,
-- scopes and resource. grant_id is allocated when the code is issued, so reusing a code can revoke what it issued.
create table public.oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_id uuid not null,
  redirect_uri text not null check (char_length(redirect_uri) <= 500),
  code_challenge text not null check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  scopes text[] not null check (cardinality(scopes) between 1 and 10),
  resource text not null check (char_length(resource) <= 300),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index oauth_codes_org_idx on public.oauth_authorization_codes(organization_id);
create index oauth_codes_expiry_idx on public.oauth_authorization_codes(expires_at);
alter table public.oauth_authorization_codes enable row level security;
revoke all on public.oauth_authorization_codes from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Access tokens (brv_at_…, 1 hour) and refresh tokens (brv_rt_…, 30 days, rotated on every use).
create table public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  grant_id uuid not null references public.oauth_grants(id) on delete cascade,
  kind text not null check (kind in ('access', 'refresh')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null check (cardinality(scopes) between 1 and 10),
  resource text not null check (char_length(resource) <= 300),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index oauth_tokens_grant_idx on public.oauth_tokens(grant_id);
create index oauth_tokens_org_idx on public.oauth_tokens(organization_id);
create index oauth_tokens_expiry_idx on public.oauth_tokens(expires_at);
alter table public.oauth_tokens enable row level security;
create policy "members read" on public.oauth_tokens for select to authenticated
  using (public.is_member(organization_id));
revoke all on public.oauth_tokens from anon, authenticated;
-- Never token_hash.
grant select (id, organization_id, user_id, client_id, grant_id, kind, scopes, resource, expires_at, revoked_at, last_used_at, created_at)
  on public.oauth_tokens to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Service keys share mcp_access_keys with personal keys: kind 'service', no user, created by an owner, optional
-- expiry. A trigger clears user_id for service keys so the owner-only insert policy decides.
alter table public.mcp_access_keys
  add column kind text not null default 'personal' check (kind in ('personal', 'service')),
  add column scopes text[] not null default array['onboarding'] check (cardinality(scopes) between 1 and 10 and scopes <@ array['onboarding', 'read', 'write']),
  add column expires_at timestamptz,
  add column created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.mcp_access_keys alter column user_id drop not null;
alter table public.mcp_access_keys
  add constraint mcp_access_keys_kind_user check ((kind = 'personal') = (user_id is not null));
create index mcp_access_keys_org_kind_idx on public.mcp_access_keys(organization_id, kind);

create function public.mcp_access_keys_service_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind = 'service' then
    new.user_id := null;
  end if;
  return new;
end;
$$;
revoke all on function public.mcp_access_keys_service_owner() from public, anon, authenticated;
create trigger mcp_access_keys_service_owner before insert on public.mcp_access_keys
  for each row execute function public.mcp_access_keys_service_owner();

drop policy "own keys read" on public.mcp_access_keys;
drop policy "own keys insert" on public.mcp_access_keys;
drop policy "own keys revoke" on public.mcp_access_keys;
-- Personal keys: each person sees and manages only their own.
create policy "own keys read" on public.mcp_access_keys for select to authenticated
  using (kind = 'personal' and public.is_member(organization_id) and user_id = (select auth.uid()));
create policy "own keys insert" on public.mcp_access_keys for insert to authenticated
  with check (kind = 'personal' and public.is_member(organization_id) and user_id = (select auth.uid()));
create policy "own keys revoke" on public.mcp_access_keys for update to authenticated
  using (kind = 'personal' and public.is_member(organization_id) and user_id = (select auth.uid()))
  with check (kind = 'personal' and public.is_member(organization_id) and user_id = (select auth.uid()));
-- Service keys: owners of the organization only.
create policy "owner service keys read" on public.mcp_access_keys for select to authenticated
  using (kind = 'service' and public.is_org_owner(organization_id));
create policy "owner service keys insert" on public.mcp_access_keys for insert to authenticated
  with check (kind = 'service' and public.is_org_owner(organization_id) and created_by = (select auth.uid()));
create policy "owner service keys revoke" on public.mcp_access_keys for update to authenticated
  using (kind = 'service' and public.is_org_owner(organization_id))
  with check (kind = 'service' and public.is_org_owner(organization_id));

revoke all on public.mcp_access_keys from authenticated, anon;
grant select (id, organization_id, user_id, kind, name, key_prefix, scopes, expires_at, created_by, created_at, last_used_at, revoked_at)
  on public.mcp_access_keys to authenticated;
-- scopes is set by its default (onboarding): clients can't grant their own keys more.
grant insert (organization_id, kind, name, key_prefix, key_hash, expires_at) on public.mcp_access_keys to authenticated;
grant update (revoked_at) on public.mcp_access_keys to authenticated;

-- Tool calls made with an OAuth token are logged against the grant; rate limits count per key or per grant.
alter table public.mcp_tool_calls
  add column oauth_grant_id uuid references public.oauth_grants(id) on delete set null;
create index mcp_tool_calls_grant_time_idx on public.mcp_tool_calls(oauth_grant_id, created_at desc);

comment on table public.oauth_clients is 'OAuth 2.1 clients registered through /oauth/register (RFC 7591). Service role only.';
comment on table public.oauth_grants is 'An approval for one OAuth client to use the MCP server for one organization; tokens belong to it.';
comment on table public.oauth_authorization_codes is 'One-time OAuth authorization codes (10 minutes, PKCE S256). Only SHA-256 hashes are stored.';
comment on table public.oauth_tokens is 'OAuth access (1 h) and refresh (30 days, rotated) tokens for /api/mcp. Only SHA-256 hashes are stored.';
comment on column public.mcp_access_keys.kind is 'personal: belongs to one user. service: organization-level key for automation, created by an owner.';
comment on column public.oauth_clients.registration_ip_hash is 'HMAC-SHA256 of the registering IP with a server-side key; used only for rate limiting.';
