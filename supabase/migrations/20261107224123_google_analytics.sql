-- Google Analytics 4 (Pro; founder decisions 2026-11-08: one Google connection for Search Console and GA4, and
-- Analytics joins the growth score with 0.10, provisional; docs/architecture/FEATURE_MODULES.md §10).
--
-- One consent screen asks for both read-only scopes. The callback stores one integration_connections row per scope
-- the owner granted (provider google_search_console and/or google_analytics), each with the same refresh token
-- encrypted on its own, so each keeps its own property choice, status and refresh guard. Disconnecting revokes the
-- token at Google, which ends both, so the app disconnects both rows together.
--
-- 1. integration_connections: allow provider google_analytics; property_labels holds the display names for the
--    property picker (GA4 properties are ids such as properties/123456).
-- 2. analytics_snapshots: one row per GA4 fetch, same shape and rules as search_console_snapshots.

-- 1. Connections ---------------------------------------------------------------------------------------------------
alter table public.integration_connections drop constraint integration_connections_provider_check;
alter table public.integration_connections add constraint integration_connections_provider_check
  check (provider in ('google_search_console', 'google_analytics'));

alter table public.integration_connections
  add column property_labels jsonb not null default '{}'::jsonb check (jsonb_typeof(property_labels) = 'object');
grant select (property_labels) on public.integration_connections to authenticated;

-- 2. Snapshots -----------------------------------------------------------------------------------------------------
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  property text not null check (property ~ '^properties/[0-9]{1,20}$'),
  date_range_start date not null,
  date_range_end date not null,
  rows jsonb not null default '{}'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  check (date_range_end >= date_range_start),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade
);
create index analytics_snapshots_org_time_idx on public.analytics_snapshots(organization_id, fetched_at desc);
create index analytics_snapshots_connection_idx on public.analytics_snapshots(connection_id, organization_id);

alter table public.analytics_snapshots enable row level security;
create policy "members read" on public.analytics_snapshots for select to authenticated
  using (public.is_member(organization_id));
revoke all on public.analytics_snapshots from authenticated, anon;
grant select on public.analytics_snapshots to authenticated;

comment on table public.analytics_snapshots is 'Google Analytics 4 snapshots, one per fetch (last 28 days vs previous 28). Deleted on disconnect.';
