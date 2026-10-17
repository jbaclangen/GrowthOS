-- In-app assistant, "Ask Braventa" (D-043). One row per question asked: the source for the per-organization daily
-- limit (40 a day) and the per-user burst limit (5 a minute). It stores no question or answer text: the conversation
-- lives only in the user's browser tab, and tokens, cost and model are logged in ai_usage (worker app_assistant).
--
-- The row is reserved BEFORE the model is called, by reserve_assistant_question(), which counts both windows and
-- inserts under a per-organization advisory lock. Parallel requests are serialized, so they can't all pass the check,
-- and a request that fails later still counts (its row is marked failed, not deleted).
--
-- Written by the server only (POST /api/assistant, service client, scoped to the organization the user's membership
-- resolved). Must be applied before the assistant is deployed: without it the route fails closed and answers
-- "isn't available right now". Rows hold no content; they are deleted with the organization or the user.

create table public.assistant_usage (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'answered', 'failed')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index assistant_usage_org_time_idx on public.assistant_usage(organization_id, created_at desc);
create index assistant_usage_user_time_idx on public.assistant_usage(user_id, created_at desc);

alter table public.assistant_usage enable row level security;
-- Members read their own rows, within an organization they belong to.
create policy "own usage read" on public.assistant_usage for select to authenticated
  using (public.is_member(organization_id) and user_id = (select auth.uid()));
revoke insert, update, delete on public.assistant_usage from authenticated, anon;

-- Atomically: count the last 24 hours for the organization and the last minute for the user, and, when both are
-- under the limits passed in (lib/assistant/access.ts ASSISTANT_LIMITS), insert a pending row. usage_id is null when
-- a limit was reached. The advisory lock is per organization and released at the end of the call's transaction.
create function public.reserve_assistant_question(
  p_organization_id uuid,
  p_user_id uuid,
  p_per_org_per_day int,
  p_per_user_per_minute int
)
returns table (usage_id bigint, org_last_day int, user_last_minute int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org int;
  v_user int;
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('assistant_usage:' || p_organization_id::text, 0));
  select count(*) into v_org from public.assistant_usage
    where organization_id = p_organization_id and created_at > now() - interval '24 hours';
  select count(*) into v_user from public.assistant_usage
    where organization_id = p_organization_id and user_id = p_user_id and created_at > now() - interval '1 minute';
  if v_org >= p_per_org_per_day or v_user >= p_per_user_per_minute then
    return query select null::bigint, v_org, v_user;
    return;
  end if;
  insert into public.assistant_usage (organization_id, user_id)
    values (p_organization_id, p_user_id)
    returning assistant_usage.id into v_id;
  return query select v_id, v_org, v_user;
end;
$$;
revoke all on function public.reserve_assistant_question(uuid, uuid, int, int) from public, anon, authenticated;
grant execute on function public.reserve_assistant_question(uuid, uuid, int, int) to service_role;

comment on table public.assistant_usage is 'In-app assistant (D-043): one row per question, the rate-limit source. No question or answer text. Written by the server only.';
