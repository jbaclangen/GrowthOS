-- Deleting a user no longer fails on who approved a draft or started a job (Q-056; D-056 legal review,
-- docs/research/LEGAL_AND_PRIVACY_REVIEW_2026-11-08.md §4 gap 5).
--
-- content_items.approved_by and ai_jobs.created_by (20261010061028_foundation.sql:193 and :232) reference auth.users
-- with no on delete action, so deleting a user who approved a draft or started an analysis fails with a foreign key
-- violation. The privacy policy and DPA promise to delete a person's data on request within 30 days, so both columns
-- now become null when the user is deleted, the same as every later "by" column (team_invitations.invited_by and
-- accepted_by, content_items.created_by, onboarding_sessions.created_by, diagnoses.confirmed_by). The rows stay with
-- their business: a draft and a job belong to the organization, which keeps them until it is deleted itself.
--
-- The set-null update runs as the table owner, not `authenticated`, so guard_content_item_write returns early and lets
-- it through (20261023224450_content_guard_pins_organization.sql:18-20); touch_updated_at bumps
-- content_items.updated_at. Nothing needs either column to be set: no RLS policy uses them, the guard only sets or
-- keeps approved_by, setContentStatus sends approved_by but the guard overrides it, and no code reads
-- ai_jobs.created_by.
--
-- Each column gets an index, so deleting a user doesn't scan either table (the same as
-- content_items_created_by_idx and team_invitations_invited_by_idx).
--
-- Applied to the Supabase project 2026-11-08 as version 20261107224152, with the founder's go-ahead (local dev
-- writes to the production database, Q-009).

alter table public.content_items
  drop constraint content_items_approved_by_fkey,
  add constraint content_items_approved_by_fkey
    foreign key (approved_by) references auth.users(id) on delete set null;

alter table public.ai_jobs
  drop constraint ai_jobs_created_by_fkey,
  add constraint ai_jobs_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

create index content_items_approved_by_idx on public.content_items(approved_by);
create index ai_jobs_created_by_idx on public.ai_jobs(created_by);
