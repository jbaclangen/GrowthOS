// Reads job_dispatch_health() (the job_dispatches migration in supabase/migrations): whether Postgres can send the
// analysis step hand-offs that production records (D-042, lib/pipeline/dispatch.ts). Shared by GET
// /api/health/integrations and `npm run health` (scripts/health-check.mts), so it imports nothing. The function
// returns versions and counts only, never a token.

export type DispatchHealth = {
  pg_net?: string | null;
  pg_cron?: string | null;
  worker_running?: boolean | null;
  sweeper_scheduled?: boolean | null;
  sweeper_last_run?: { status?: string | null; at?: string | null } | null;
  dispatches_last_day?: number | null;
  failed_posts_last_6h?: number | null;
  failed_posts_by_status?: Record<string, number> | null;
  unanswered_posts?: number | null;
  stuck_in_queue?: number | null;
};

export type HealthStatus = "OK" | "WARN" | "FAIL";
export type DispatchHealthReport = { status: HealthStatus; problems: string[]; summary: string };

// The sweeper runs every minute; a last run older than this means pg_cron stopped running it.
export const SWEEPER_STALE_MS = 5 * 60_000;
const RESTART = "run `select net.worker_restart();` in the SQL editor";

// FAIL: hand-offs can't go out (an extension, the worker or the sweeper is missing, or posts got no answer at all,
// which leaves their jobs waiting for the 10-minute reaper). WARN: posts were refused or failed (their jobs were
// failed with "couldn't continue"), or the sweeper hasn't run yet.
export function assessDispatchHealth(h: DispatchHealth, now: number = Date.now()): DispatchHealthReport {
  const fail: string[] = [];
  const warn: string[] = [];
  if (!h.pg_net) fail.push("the pg_net extension isn't installed");
  if (!h.pg_cron) fail.push("the pg_cron extension isn't installed");
  if (h.pg_net && h.worker_running === false) fail.push(`pg_net's background worker isn't running: ${RESTART}`);
  if (!h.sweeper_scheduled) {
    fail.push("the braventa-job-dispatch-sweeper schedule is missing");
  } else if (!h.sweeper_last_run?.at) {
    warn.push("the sweeper hasn't run yet (it runs every minute)");
  } else {
    const at = Date.parse(h.sweeper_last_run.at);
    if (h.sweeper_last_run.status === "failed") fail.push("the sweeper's last run failed (see cron.job_run_details)");
    else if (!Number.isFinite(at) || now - at > SWEEPER_STALE_MS) fail.push(`the sweeper last ran at ${h.sweeper_last_run.at}: pg_cron isn't running it`);
  }
  const unanswered = h.unanswered_posts ?? 0;
  if (unanswered > 0) {
    const stuck = h.stuck_in_queue ?? 0;
    fail.push(
      `${unanswered} hand-off post${unanswered === 1 ? "" : "s"} got no answer within 2 minutes in the last 6 h ` +
        `(${stuck} still queued in net.http_request_queue): pg_net's worker stopped or fell behind, or lost its queue; ${RESTART}`,
    );
  }
  const failed = h.failed_posts_last_6h ?? 0;
  if (failed > 0) {
    const byStatus = Object.entries(h.failed_posts_by_status ?? {})
      .map(([status, n]) => `${status} x${n}`)
      .join(", ");
    warn.push(
      `${failed} hand-off post${failed === 1 ? " was" : "s were"} refused or failed in the last 6 h${byStatus ? ` (${byStatus})` : ""}; ` +
        "401 means the deployment at NEXT_PUBLIC_APP_URL signs with another key (JOB_CONTINUE_SECRET), 3xx or 404 a wrong URL",
    );
  }
  const summary =
    `pg_net ${h.pg_net ?? "missing"} (worker ${h.worker_running === false ? "down" : h.worker_running ? "running" : "unknown"}), ` +
    `pg_cron ${h.pg_cron ?? "missing"}, sweeper ${h.sweeper_scheduled ? `scheduled, last run ${h.sweeper_last_run?.at ?? "none yet"}` : "missing"}; ` +
    `${h.dispatches_last_day ?? 0} hand-offs in the last day, ${failed} failed and ${unanswered} unanswered posts in the last 6 h`;
  return { status: fail.length ? "FAIL" : warn.length ? "WARN" : "OK", problems: [...fail, ...warn], summary };
}
