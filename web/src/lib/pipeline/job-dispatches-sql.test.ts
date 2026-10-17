import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DispatchHealth } from "./dispatch-health";
import type { ResendResult } from "./dispatch";
import { HANDOFF_ERROR } from "./handoff";

// The job_dispatches migration repeats a few things the app defines (the failure message, which answers are worth
// another post, the RPCs' answers) and carries the table's security. There is no Postgres in the tests, so these
// checks read the SQL itself and fail when the two drift apart or a safeguard is dropped.

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith("_job_dispatches.sql"));
const sql = files.length === 1 ? readFileSync(dir + files[0], "utf8") : "";
// The SQL without comments, so a check can't pass on what a comment says.
const code = sql.replace(/--.*$/gm, "");

describe("the job_dispatches migration", () => {
  it("exists exactly once", () => {
    expect(files).toHaveLength(1);
  });

  it("fails a hand-off the route refused with the app's own message", () => {
    expect(code).toContain(`'${HANDOFF_ERROR.replaceAll("'", "''")}'`);
    // The same guard as failPendingStep: only while the step is still pending.
    expect(code).toMatch(/output->>'step' = r\.step\s+and output->>'step_state' = 'pending'/);
  });

  it("treats the same answers as worth another post as retryable() does", () => {
    expect(code).toContain("r.status_code is null or r.status_code in (408, 429) or r.status_code >= 500 then p_attempts >= 4");
    expect(code).toContain("when r.status_code = 202 then false");
  });

  it("answers re-sends with exactly the values the app handles", () => {
    const answers: ResendResult[] = ["posted", "not_pending", "failed", "missing"];
    const returned = [...code.matchAll(/return '([a-z_]+)';/g)].map((m) => m[1]);
    expect(new Set(returned)).toEqual(new Set(answers));
  });

  it("reports every field the health checks read", () => {
    const fields: (keyof DispatchHealth)[] = [
      "pg_net",
      "pg_cron",
      "worker_running",
      "sweeper_scheduled",
      "sweeper_last_run",
      "dispatches_last_day",
      "failed_posts_last_6h",
      "failed_posts_by_status",
      "unanswered_posts",
      "stuck_in_queue",
    ];
    for (const field of fields) expect(code).toContain(`'${field}',`);
  });

  it("keeps the tokens service-role only", () => {
    expect(code).toContain("alter table public.job_dispatches enable row level security;");
    expect(code).toContain("revoke all on public.job_dispatches from public, anon, authenticated;");
    expect(code).not.toMatch(/create policy/i);
    expect(code).toMatch(/check \(url ~ '\^https:\/\//);
    // Every function runs as its owner with an empty search_path.
    const definers = code.match(/security definer/g) ?? [];
    expect(definers.length).toBeGreaterThan(0);
    expect(code.match(/security definer\s+set search_path = ''/g)).toHaveLength(definers.length);
    // Only the two service RPCs are executable, and only by service_role.
    const grants = [...code.matchAll(/grant execute on function (\S+)\(.*?\) to (\w+);/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(grants).toEqual(["public.resend_job_dispatch service_role", "public.job_dispatch_health service_role"]);
    for (const fn of ["post_job_dispatch", "job_dispatches_send", "job_dispatch_failed", "sweep_job_dispatches", "cleanup_job_dispatches"]) {
      expect(code).toMatch(new RegExp(`revoke all on function public\\.${fn}\\(.*?\\) from public, anon, authenticated, service_role;`));
    }
  });
});
