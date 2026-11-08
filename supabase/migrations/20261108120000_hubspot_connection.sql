-- HubSpot connection, read-only (D-048), storing aggregates only (D-059). Pro, Premium and the Pro trial; owner only
-- (integrations.connect, D-046). An owner installs Braventa's unlisted HubSpot app in their own portal; the refresh
-- token is encrypted by the app (AES-256-GCM, INTEGRATIONS_ENCRYPTION_KEY) like the Search Console token, and access
-- tokens are minted per sync and never stored. Spec: docs/architecture/HUBSPOT_SETUP.md.
--
-- Braventa reads contacts, companies and deals but keeps only counts and totals (snapshot `metrics`): no names, email
-- addresses, phone numbers, deal names or record ids. Disconnecting deletes every snapshot and the token.

-- 1. HubSpot as a provider on the existing connections table (one row per organization and provider), keeping the
-- Google providers that 20261107224123_google_analytics.sql allows.
alter table public.integration_connections drop constraint integration_connections_provider_check;
alter table public.integration_connections add constraint integration_connections_provider_check
  check (provider in ('google_search_console', 'google_analytics', 'hubspot'));

-- The connected account at a provider without a Google email: for HubSpot, the portal (hub) id and its domain, shown so
-- the owner can see which portal is connected. Null for Search Console.
alter table public.integration_connections
  add column external_account_id text check (external_account_id is null or char_length(external_account_id) <= 64),
  add column external_account_name text check (external_account_name is null or char_length(external_account_name) <= 255);

-- Members may read the new non-secret columns (the token column stays ungranted).
grant select (external_account_id, external_account_name) on public.integration_connections to authenticated;

-- 2. One row per fetch: counts and totals only, for the last 28 days and the 28 days before plus current totals.
create table public.hubspot_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  portal_id text not null check (char_length(portal_id) <= 64),
  period_start date not null,
  period_end date not null,
  -- Aggregates only (lib/integrations/hubspot.ts, HubSpotMetrics). Bounded so a bug can't store record lists.
  metrics jsonb not null default '{}'::jsonb check (octet_length(metrics::text) <= 32768),
  fetched_at timestamptz not null default now(),
  check (period_end >= period_start),
  -- The snapshot belongs to the same organization as its connection.
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade
);
create index hubspot_snapshots_org_time_idx on public.hubspot_snapshots(organization_id, fetched_at desc);
create index hubspot_snapshots_connection_idx on public.hubspot_snapshots(connection_id, organization_id);

alter table public.hubspot_snapshots enable row level security;
create policy "members read" on public.hubspot_snapshots for select to authenticated
  using (public.is_member(organization_id));
revoke all on public.hubspot_snapshots from authenticated, anon;
grant select on public.hubspot_snapshots to authenticated;

-- 3. The connect form's agreement checkbox (D-057, MSA §8) is recorded as its own context, like Search Console's.
alter table public.legal_acceptances drop constraint legal_acceptances_context_check;
alter table public.legal_acceptances add constraint legal_acceptances_context_check
  check (context in (
    'signup', 'terms_update', 'website_authorization', 'search_console_connect', 'access_key', 'assistant_oauth',
    'hubspot_connect'
  ));

comment on table public.integration_connections is 'OAuth connections to external services (Google Search Console, HubSpot). Refresh tokens are AES-256-GCM ciphertext written by the server; never selectable by clients.';
comment on column public.integration_connections.external_account_id is 'HubSpot portal (hub) id. Null for Search Console.';
comment on column public.integration_connections.external_account_name is 'HubSpot portal domain, for display. Null for Search Console.';
comment on table public.hubspot_snapshots is 'HubSpot CRM counts and totals, one row per fetch (no names, emails or record ids, D-059). The 12 most recent are kept; deleted on disconnect.';
