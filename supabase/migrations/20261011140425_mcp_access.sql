-- AI assistant connection (MCP), phase 1 (D-036). An owner creates a personal access key in the app and adds
-- Braventa's MCP server (/api/mcp) to Claude Code or Claude Desktop. The key is shown once; only its SHA-256 hash
-- is stored. The MCP route looks keys up with the service client and scopes every query to the key's organization.

create table public.mcp_access_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 60),
  key_prefix text not null check (char_length(key_prefix) between 8 and 16),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index mcp_access_keys_org_idx on public.mcp_access_keys(organization_id);
create index mcp_access_keys_user_idx on public.mcp_access_keys(user_id);

alter table public.mcp_access_keys enable row level security;
-- Owners see and manage their own keys only, within an organization they belong to.
create policy "own keys read" on public.mcp_access_keys for select to authenticated
  using (public.is_member(organization_id) and user_id = (select auth.uid()));
create policy "own keys insert" on public.mcp_access_keys for insert to authenticated
  with check (public.is_member(organization_id) and user_id = (select auth.uid()));
create policy "own keys revoke" on public.mcp_access_keys for update to authenticated
  using (public.is_member(organization_id) and user_id = (select auth.uid()))
  with check (public.is_member(organization_id) and user_id = (select auth.uid()));
revoke all on public.mcp_access_keys from authenticated, anon;
-- The hash is never readable from the browser; last_used_at is written by the server only.
grant select (id, organization_id, user_id, name, key_prefix, created_at, last_used_at, revoked_at)
  on public.mcp_access_keys to authenticated;
grant insert (organization_id, name, key_prefix, key_hash) on public.mcp_access_keys to authenticated;
grant update (revoked_at) on public.mcp_access_keys to authenticated;

-- One row per MCP tool call: the audit log the owner can be shown, and the source for per-key rate limits.
create table public.mcp_tool_calls (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key_id uuid references public.mcp_access_keys(id) on delete set null,
  tool text not null check (char_length(tool) <= 80),
  ok boolean not null,
  error text check (error is null or char_length(error) <= 300),
  created_at timestamptz not null default now()
);
create index mcp_tool_calls_key_time_idx on public.mcp_tool_calls(key_id, created_at desc);
create index mcp_tool_calls_org_idx on public.mcp_tool_calls(organization_id);

alter table public.mcp_tool_calls enable row level security;
create policy "members read" on public.mcp_tool_calls for select to authenticated
  using (public.is_member(organization_id));
revoke insert, update, delete on public.mcp_tool_calls from authenticated, anon;

-- While billing isn't built, a business whose trial ended asks for Basic the same way as for Pro (D-036):
-- the AI assistant connection returns once it's on a plan.
alter table public.upgrade_requests drop constraint upgrade_requests_tier_check;
alter table public.upgrade_requests add constraint upgrade_requests_tier_check check (tier in ('basic', 'pro', 'premium'));

comment on table public.mcp_access_keys is 'Personal access keys for the AI assistant connection (MCP, D-036). Only the SHA-256 hash is stored.';
comment on table public.mcp_tool_calls is 'Audit log and rate-limit source for MCP tool calls (D-036).';
