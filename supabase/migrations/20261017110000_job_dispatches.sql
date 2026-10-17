-- Analysis step hand-offs sent by Supabase, not by the app (D-042, amended 2026-10-17).
--
-- Why: each analysis step runs in its own Vercel function invocation (D-042). Until now the app handed each step to
-- the next by POSTing to its own /api/jobs/continue. Vercel treats a deployment calling itself in a chain as a loop:
-- the 5th self-call of a re-run (crawling, profiling, scoring, planning, writing) came back HTTP 508
-- INFINITE_LOOP_DETECTED in production on 2026-10-17. In production the app now records the hand-off in
-- public.job_dispatches and Postgres sends the POST (pg_net), so no request chain between invocations ever forms.
-- Local development keeps the direct self-call (Supabase can't reach localhost); see web/src/lib/pipeline/dispatch.ts.
--
-- Flow:
--   1. The server inserts (organization_id, job_id, step, url, token) with the service client, scoped to the job's
--      organization (lib/pipeline/dispatch.ts). The token is the existing HMAC of job id + step
--      (lib/pipeline/continue-token.ts); the route verifies it exactly as before.
--   2. AFTER INSERT, job_dispatches_send() queues net.http_post(url, {jobId, step, token}). pg_net sends it only after
--      the inserting transaction commits (a rolled-back insert sends nothing).
--   3. Every minute, sweep_job_dispatches() looks at dispatches whose job is still active with that step pending:
--      - the last post was refused (an answer another post of the same token won't change: 401 from a deployment that
--        signs with another key, 404, a redirect, Deployment Protection), or 4 posts were made and the last one failed
--        too (timeout, connection error, 408, 429 or 5xx): it fails the job the way the app does when a hand-off isn't
--        accepted (lib/pipeline/claims.ts failPendingStep, message HANDOFF_ERROR in lib/pipeline/handoff.ts);
--      - otherwise, when the last post is over 60 s old and fewer than 4 posts were made, it posts again.
--      A post that never gets an answer at all (pg_net's worker stopped, or its queue was lost in a crash) is left to
--      the app's 10-minute stale-job reaper, and job_dispatch_health() reports it as unanswered.
--      The report page's re-send (resend_job_dispatch) follows the same rules.
--   4. Every hour, cleanup_job_dispatches() deletes dispatches older than a day and this sweeper's old cron history.
--   Repeated posts are harmless: the step's claim on ai_jobs lets only one invocation run it.
--
-- SECURITY REVIEW
-- - job_dispatches holds bearer tokens: anyone with one can make the app run that job's step while it is pending.
--   So the table is service-role only: RLS is enabled with NO policies, and every privilege is revoked from anon and
--   authenticated (and PUBLIC). Members can't read, write or even count rows through the Data API. The server never
--   reads a token back (inserts return no representation; resends happen inside Postgres).
-- - A token is only good for one job's one step, only while that step is pending, and returns no data; rows are
--   deleted with the job or the organization (cascades) and by the hourly cleanup after a day.
-- - url is constrained to an https URL whose path is exactly /api/jobs/continue, so even a bug in the server can't
--   make Postgres post a token to some other path or over plain http. token must look like an HMAC-SHA256 in base64url.
-- - (job_id, organization_id) is a composite foreign key to ai_jobs, so a dispatch can't pair one organization with
--   another organization's job. The sweeper fails a job only through that pair and only while the dispatch's step is
--   still pending, the same guard as failPendingStep.
-- - The functions are SECURITY DEFINER with an empty search_path (every name schema-qualified). Only
--   resend_job_dispatch and job_dispatch_health are executable, by service_role only; the trigger, sweeper, cleanup
--   and helper functions are executable by nobody but their owner (cron runs as the owner). job_dispatch_health
--   returns versions and counts, never a token.
-- - pg_net's own tables are in the net schema, which the Data API doesn't expose: net.http_request_queue holds each
--   request body (so the token) until the worker sends it, net._http_response keeps responses for 6 hours. pg_net
--   grants them to PUBLIC, and Supabase doesn't support changing that, so any database login role (postgres, or a
--   role created with LOGIN) can read a queued token, not only the Data API's roles. A stalled pg_net worker keeps
--   bodies in the queue until it is restarted (select net.worker_restart();); job_dispatch_health reports that.
--
-- Must be applied BEFORE the app version that uses it is deployed: on Vercel the app records hand-offs here, and
-- without this table every analysis fails at its first hand-off with "The analysis couldn't continue."
-- Apply it with the Supabase CLI (supabase db push) so the project records version 20261017110000 and the file name
-- stays in step with it (docs/architecture/DATA_MODEL.md).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- For the same-organization composite foreign key below (id is already the primary key).
alter table public.ai_jobs add constraint ai_jobs_id_org_key unique (id, organization_id);

create table public.job_dispatches (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null,
  step text not null check (step ~ '^[a-z_]{1,40}$'),
  url text not null check (url ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?/api/jobs/continue$'),
  token text not null check (token ~ '^[A-Za-z0-9_-]{43}$'),
  attempts int not null default 0,
  last_sent_at timestamptz,
  -- net.http_post's request id of the last post, to find its response in net._http_response (kept 6 hours).
  last_request_id bigint,
  created_at timestamptz not null default now(),
  unique (job_id, step),
  foreign key (job_id, organization_id) references public.ai_jobs(id, organization_id) on delete cascade
);
create index job_dispatches_org_idx on public.job_dispatches(organization_id);

alter table public.job_dispatches enable row level security;
-- No policies on purpose: service role only (see the security review above).
revoke all on public.job_dispatches from public, anon, authenticated;

comment on table public.job_dispatches is 'Analysis step hand-offs (D-042): Postgres POSTs {jobId, step, token} to the app with pg_net. Holds HMAC bearer tokens: service role only, no RLS policies. Rows deleted with the job and after a day.';
comment on column public.job_dispatches.token is 'HMAC-SHA256 of job id + step (lib/pipeline/continue-token.ts). Secret: never expose to clients.';

-- Posts one dispatch now and records the attempt. Internal: called by the trigger, the sweeper and
-- resend_job_dispatch. 10 s is plenty for the route, which answers 202 before doing any work.
create function public.post_job_dispatch(p_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.job_dispatches%rowtype;
  v_request bigint;
begin
  select * into d from public.job_dispatches where id = p_id for update;
  if not found then
    return null;
  end if;
  v_request := net.http_post(
    url := d.url,
    body := jsonb_build_object('jobId', d.job_id, 'step', d.step, 'token', d.token),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  update public.job_dispatches
    set attempts = attempts + 1, last_sent_at = now(), last_request_id = v_request
    where id = p_id;
  return v_request;
end;
$$;

create function public.job_dispatches_send()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.post_job_dispatch(new.id);
  return null;
end;
$$;

create trigger job_dispatches_send
  after insert on public.job_dispatches
  for each row execute function public.job_dispatches_send();

-- Whether a hand-off has failed for good, from pg_net's response to its last post (net._http_response, kept 6 hours):
-- the route refused it with an answer another post of the same token won't change (anything but 202, 408, 429 or a
-- 5xx, as retryable() in lib/pipeline/dispatch.ts), or 4 posts were made and the last one failed too (a timeout or
-- connection error has no status code). False while the last post has no answer yet, and when it was accepted.
create function public.job_dispatch_failed(p_request_id bigint, p_attempts integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when r.status_code = 202 then false
      when r.status_code is null or r.status_code in (408, 429) or r.status_code >= 500 then p_attempts >= 4
      else true
    end
    from net._http_response r
    where r.id = p_request_id
    limit 1
  ), false);
$$;

-- Fails dispatches that failed for good (job_dispatch_failed) and re-posts the others still pending more than 60 s
-- after the last post (the app's RESEND_AFTER_MS), up to 4 posts in all. Only while the job is active and still
-- waiting for that step. Returns how many dispatches it acted on.
create function public.sweep_job_dispatches()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select d.id, d.organization_id, d.job_id, d.step, public.job_dispatch_failed(d.last_request_id, d.attempts) as failed
    from public.job_dispatches d
    join public.ai_jobs j on j.id = d.job_id and j.organization_id = d.organization_id
    where j.status in ('queued', 'running')
      and j.output->>'step' = d.step
      and j.output->>'step_state' = 'pending'
      and (
        public.job_dispatch_failed(d.last_request_id, d.attempts)
        or (d.attempts < 4 and (d.last_sent_at is null or d.last_sent_at < now() - interval '60 seconds'))
      )
    order by d.id
    limit 50
    for update of d skip locked
  loop
    if r.failed then
      -- As failPendingStep (lib/pipeline/claims.ts) with HANDOFF_ERROR (lib/pipeline/handoff.ts): matches only while
      -- the step is still pending, so a step an invocation has claimed meanwhile is left alone. Drops the step's
      -- artifacts with the state.
      update public.ai_jobs
        set status = 'failed',
            error = 'The analysis couldn''t continue. Run it again.',
            finished_at = now(),
            output = jsonb_build_object('step', r.step)
        where id = r.job_id
          and organization_id = r.organization_id
          and status in ('queued', 'running')
          and output->>'step' = r.step
          and output->>'step_state' = 'pending';
    else
      perform public.post_job_dispatch(r.id);
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- The app's re-send (the report page's poll, lib/pipeline/jobs.ts), for the organization the caller has already
-- authorised: re-posts the stored dispatch, so the token never leaves the database. Returns
--   'posted'       re-posted;
--   'not_pending'  the job no longer waits for that step: nothing to send;
--   'failed'       the hand-off failed for good (job_dispatch_failed): the app fails the job (failPendingStep);
--   'missing'      there is no such dispatch: the app records a new one.
create function public.resend_job_dispatch(p_organization_id uuid, p_job_id uuid, p_step text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_attempts integer;
  v_request bigint;
begin
  select d.id, d.attempts, d.last_request_id into v_id, v_attempts, v_request
  from public.job_dispatches d
  where d.job_id = p_job_id and d.organization_id = p_organization_id and d.step = p_step;
  if v_id is null then
    return 'missing';
  end if;
  if not exists (
    select 1 from public.ai_jobs j
    where j.id = p_job_id and j.organization_id = p_organization_id
      and j.status in ('queued', 'running')
      and j.output->>'step' = p_step
      and j.output->>'step_state' = 'pending'
  ) then
    return 'not_pending';
  end if;
  if public.job_dispatch_failed(v_request, v_attempts) then
    return 'failed';
  end if;
  perform public.post_job_dispatch(v_id);
  return 'posted';
end;
$$;

-- Tokens are useless once a job has moved on, and every job is over (or dead) within a day.
create function public.cleanup_job_dispatches()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.job_dispatches where created_at < now() - interval '1 day';
  delete from cron.job_run_details
    where end_time < now() - interval '7 days'
      and jobid in (select jobid from cron.job where jobname in ('braventa-job-dispatch-sweeper', 'braventa-job-dispatch-cleanup'));
end;
$$;

-- For the health checks (GET /api/health/integrations, npm run health), service role only. Versions and counts, never
-- a token. web/src/lib/pipeline/dispatch-health.ts reads it:
--   worker_running         pg_net's background worker is in pg_stat_activity (Supabase's webhook debugging guide);
--   sweeper_last_run       the sweeper's latest cron run: status and start time;
--   failed_posts_last_6h   last posts answered with anything but 202, timed out or failed to connect, and
--   failed_posts_by_status the same by status code ('timeout' or 'error' when there is none);
--   unanswered_posts       last posts sent between 6 hours and 2 minutes ago with no response at all: pg_net's worker
--                          stopped or fell behind, or its queue was lost in a crash. These hand-offs never reached the
--                          app, and their jobs wait for the 10-minute reaper. Remedy: select net.worker_restart();
--   stuck_in_queue         of those, the ones still waiting in net.http_request_queue (worker stopped, not queue lost).
create function public.job_dispatch_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return jsonb_build_object(
    'pg_net', (select extversion from pg_catalog.pg_extension where extname = 'pg_net'),
    'pg_cron', (select extversion from pg_catalog.pg_extension where extname = 'pg_cron'),
    'worker_running', exists (select 1 from pg_catalog.pg_stat_activity where backend_type ilike '%pg_net%'),
    'sweeper_scheduled', exists (select 1 from cron.job where jobname = 'braventa-job-dispatch-sweeper' and active),
    'sweeper_last_run', (
      select jsonb_build_object('status', rd.status, 'at', rd.start_time)
      from cron.job_run_details rd
      join cron.job cj on cj.jobid = rd.jobid
      where cj.jobname = 'braventa-job-dispatch-sweeper'
      order by rd.runid desc
      limit 1
    ),
    'dispatches_last_day', (select count(*) from public.job_dispatches where created_at > now() - interval '1 day'),
    'failed_posts_last_6h', (
      select count(*)
      from public.job_dispatches d
      join net._http_response r on r.id = d.last_request_id
      where r.created > now() - interval '6 hours' and r.status_code is distinct from 202
    ),
    'failed_posts_by_status', coalesce((
      select jsonb_object_agg(s.label, s.n)
      from (
        select coalesce(r.status_code::text, case when r.timed_out then 'timeout' else 'error' end) as label, count(*) as n
        from public.job_dispatches d
        join net._http_response r on r.id = d.last_request_id
        where r.created > now() - interval '6 hours' and r.status_code is distinct from 202
        group by 1
      ) s
    ), '{}'::jsonb),
    'unanswered_posts', (
      select count(*)
      from public.job_dispatches d
      where d.last_request_id is not null
        and d.last_sent_at > now() - interval '6 hours'
        and d.last_sent_at < now() - interval '2 minutes'
        and not exists (select 1 from net._http_response r where r.id = d.last_request_id)
    ),
    'stuck_in_queue', (
      select count(*)
      from public.job_dispatches d
      join net.http_request_queue q on q.id = d.last_request_id
      where d.last_sent_at > now() - interval '6 hours'
        and d.last_sent_at < now() - interval '2 minutes'
    )
  );
end;
$$;

revoke all on function public.post_job_dispatch(bigint) from public, anon, authenticated, service_role;
revoke all on function public.job_dispatches_send() from public, anon, authenticated, service_role;
revoke all on function public.job_dispatch_failed(bigint, integer) from public, anon, authenticated, service_role;
revoke all on function public.sweep_job_dispatches() from public, anon, authenticated, service_role;
revoke all on function public.cleanup_job_dispatches() from public, anon, authenticated, service_role;
revoke all on function public.resend_job_dispatch(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.resend_job_dispatch(uuid, uuid, text) to service_role;
revoke all on function public.job_dispatch_health() from public, anon, authenticated;
grant execute on function public.job_dispatch_health() to service_role;

-- Scheduling a job under an existing name replaces it, so re-running this is safe.
select cron.schedule('braventa-job-dispatch-sweeper', '* * * * *', 'select public.sweep_job_dispatches()');
select cron.schedule('braventa-job-dispatch-cleanup', '7 * * * *', 'select public.cleanup_job_dispatches()');
