-- Google Search Console connection (Pro; founder decision 2026-10-11, Website Intelligence blueprint §3.5, phase 2).
-- An owner connects a Google account with the read-only webmasters scope. The refresh token is encrypted by the app
-- (AES-256-GCM, INTEGRATIONS_ENCRYPTION_KEY) and is never readable from the browser: members may select only the
-- non-secret columns, and all writes go through server code with the service role, scoped to an organization the
-- user is already authorised for. Access tokens are minted per sync and never stored.
--
-- Note: the foundation's generic `integrations` table (Vault secret id) stays unused; this provider-specific table
-- replaces it for Search Console (docs/architecture/DATA_MODEL.md).

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('google_search_console')),
  connected_by uuid references auth.users(id) on delete set null,
  google_account_email text check (google_account_email is null or char_length(google_account_email) <= 320),
  refresh_token_ciphertext text check (refresh_token_ciphertext is null or refresh_token_ciphertext like 'v1:%'),
  scopes text[] not null default '{}',
  -- Verified Search Console properties the connected account can read (for the property picker).
  available_properties text[] not null default '{}',
  selected_property text check (selected_property is null or char_length(selected_property) <= 2048),
  status text not null default 'active' check (status in ('active', 'paused', 'revoked', 'error')),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  last_synced_at timestamptz,
  -- Start of the latest fetch, successful or not: the 10-minute refresh guard.
  last_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  unique (id, organization_id),
  -- A revoked connection keeps no token.
  check (status <> 'revoked' or refresh_token_ciphertext is null)
);
create index integration_connections_connected_by_idx on public.integration_connections(connected_by);

create trigger touch_updated_at before update on public.integration_connections
  for each row execute function public.touch_updated_at();

alter table public.integration_connections enable row level security;
create policy "members read" on public.integration_connections for select to authenticated
  using (public.is_member(organization_id));
-- Column-level grants: a column revoke has no effect while a table-level grant exists, so revoke everything first.
revoke all on public.integration_connections from authenticated, anon;
grant select (id, organization_id, provider, connected_by, google_account_email, scopes, available_properties,
  selected_property, status, last_error, last_synced_at, last_attempted_at, created_at, updated_at)
  on public.integration_connections to authenticated;

-- One row per fetch: totals for the last 28 days and the 28 days before, top queries, top pages, device split,
-- sitemaps and (when available) Google's URL Inspection result for the home page. Deleted on disconnect.
create table public.search_console_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  property text not null check (char_length(property) <= 2048),
  date_range_start date not null,
  date_range_end date not null,
  dimensions text[] not null default '{}',
  rows jsonb not null default '{}'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  check (date_range_end >= date_range_start),
  -- The snapshot belongs to the same organization as its connection.
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade
);
create index search_console_snapshots_org_time_idx on public.search_console_snapshots(organization_id, fetched_at desc);
create index search_console_snapshots_connection_idx on public.search_console_snapshots(connection_id, organization_id);

alter table public.search_console_snapshots enable row level security;
create policy "members read" on public.search_console_snapshots for select to authenticated
  using (public.is_member(organization_id));
revoke all on public.search_console_snapshots from authenticated, anon;
grant select on public.search_console_snapshots to authenticated;

comment on table public.integration_connections is 'OAuth connections to external services (Google Search Console). Refresh tokens are AES-256-GCM ciphertext written by the server; never selectable by clients.';
comment on column public.integration_connections.refresh_token_ciphertext is 'v1:iv:tag:ciphertext (base64url), key INTEGRATIONS_ENCRYPTION_KEY. Not granted to authenticated.';
comment on table public.search_console_snapshots is 'Search Console performance snapshots, one per fetch (last 28 days vs previous 28). Deleted on disconnect.';
