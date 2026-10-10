-- Fix for onboarding_discovery: a column-level REVOKE has no effect while the table-level grant exists.
-- Signed-in users may create a session and move its status; job links are set by server code only.
revoke insert, update on public.onboarding_sessions from authenticated, anon;
grant insert (organization_id, business_profile_id, created_by, status, catalog_version)
  on public.onboarding_sessions to authenticated;
grant update (status, completed_at) on public.onboarding_sessions to authenticated;
