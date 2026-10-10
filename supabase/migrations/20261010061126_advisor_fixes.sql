-- Fixes from the Supabase security/performance advisors after the foundation migration.

-- RLS helpers are only used by policies scoped to `authenticated`; keep them off the anon API.
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- One permissive SELECT policy on memberships: split the admin "for all" policy by action.
drop policy "admins manage memberships" on public.memberships;
create policy "admins insert memberships" on public.memberships
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "admins update memberships" on public.memberships
  for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "admins delete memberships" on public.memberships
  for delete to authenticated using (public.is_org_admin(organization_id));

-- Cover foreign keys used by cascading / set-null deletes.
create index knowledge_chunks_document_idx on public.knowledge_chunks(document_id);
create index content_items_campaign_idx on public.content_items(campaign_id);
create index content_calendars_campaign_idx on public.content_calendars(campaign_id);
create index brand_profiles_business_profile_idx on public.brand_profiles(business_profile_id);
create index ai_usage_job_idx on public.ai_usage(job_id);
