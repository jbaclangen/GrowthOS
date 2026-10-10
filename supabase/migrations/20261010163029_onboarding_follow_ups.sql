-- AI-assisted onboarding, stage 2 (ON-5, ON-6, D-028): adaptive follow-up questions.
-- Questions come from the typed question bank in web/src/lib/onboarding/followups.ts; only stable keys are stored.

alter table public.onboarding_sessions drop constraint onboarding_sessions_status_check;
alter table public.onboarding_sessions add constraint onboarding_sessions_status_check
  check (status in ('discovering', 'reviewing', 'following_up', 'completed', 'skipped'));

create table public.onboarding_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  session_id uuid not null,
  -- The confirmed pain point the question is about, and the question-bank key.
  pain_point_id text not null,
  question_key text not null,
  round smallint not null check (round between 1 and 3),
  -- pending = asked, not answered yet; the owner may skip a question or mark it not applicable.
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'skipped', 'not_applicable')),
  answer text check (answer is null or char_length(answer) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz,
  foreign key (session_id, organization_id)
    references public.onboarding_sessions(id, organization_id) on delete cascade,
  unique (session_id, pain_point_id, question_key),
  check ((status = 'answered') = (answer is not null))
);
create index onboarding_follow_ups_org_idx on public.onboarding_follow_ups(organization_id);
create index onboarding_follow_ups_session_idx on public.onboarding_follow_ups(session_id);

alter table public.onboarding_follow_ups enable row level security;
create policy "members all" on public.onboarding_follow_ups for all to authenticated
  using (public.is_member(organization_id)) with check (public.is_member(organization_id));

create trigger touch_updated_at before update on public.onboarding_follow_ups
  for each row execute function public.touch_updated_at();

comment on table public.onboarding_follow_ups is 'Adaptive follow-up questions asked during onboarding and the owner''s answers (Customer-provided). At most about 4 per session (ON-5).';
