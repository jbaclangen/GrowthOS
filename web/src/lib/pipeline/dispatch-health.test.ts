import { describe, expect, it } from "vitest";
import { SWEEPER_STALE_MS, assessDispatchHealth, type DispatchHealth } from "./dispatch-health";

const NOW = Date.parse("2026-10-17T12:00:00.000Z");
const HEALTHY: DispatchHealth = {
  pg_net: "0.20.0",
  pg_cron: "1.6.4",
  worker_running: true,
  sweeper_scheduled: true,
  sweeper_last_run: { status: "succeeded", at: "2026-10-17T11:59:00.123456+00:00" },
  dispatches_last_day: 12,
  failed_posts_last_6h: 0,
  failed_posts_by_status: {},
  unanswered_posts: 0,
  stuck_in_queue: 0,
};
const assess = (patch: DispatchHealth) => assessDispatchHealth({ ...HEALTHY, ...patch }, NOW);

describe("assessDispatchHealth", () => {
  it("is OK when the extensions, the worker and the sweeper run and every post was answered", () => {
    const r = assessDispatchHealth(HEALTHY, NOW);
    expect(r).toMatchObject({ status: "OK", problems: [] });
    expect(r.summary).toContain("pg_net 0.20.0 (worker running)");
    expect(r.summary).toContain("12 hand-offs in the last day, 0 failed and 0 unanswered posts");
  });

  it("fails when the migration's extensions or the sweeper schedule are missing", () => {
    const r = assessDispatchHealth({ sweeper_scheduled: false }, NOW);
    expect(r.status).toBe("FAIL");
    expect(r.problems).toEqual([
      "the pg_net extension isn't installed",
      "the pg_cron extension isn't installed",
      "the braventa-job-dispatch-sweeper schedule is missing",
    ]);
  });

  it("fails when pg_net's worker is down, and names the restart", () => {
    const r = assess({ worker_running: false });
    expect(r.status).toBe("FAIL");
    expect(r.problems[0]).toContain("select net.worker_restart();");
  });

  // Posts that never got a response (worker stalled, or queue lost in a crash) used to read as healthy: no response
  // row, so not a failed post. Their jobs wait for the 10-minute reaper.
  it("fails when posts got no answer at all, even with no failed posts", () => {
    const r = assess({ unanswered_posts: 3, stuck_in_queue: 2, failed_posts_last_6h: 0 });
    expect(r.status).toBe("FAIL");
    expect(r.problems).toEqual([expect.stringContaining("3 hand-off posts got no answer within 2 minutes")]);
    expect(r.problems[0]).toContain("2 still queued in net.http_request_queue");
    expect(r.problems[0]).toContain("select net.worker_restart();");
  });

  it("warns about refused or failed posts, by status, and says what a 401 means", () => {
    const r = assess({ failed_posts_last_6h: 3, failed_posts_by_status: { "401": 2, timeout: 1 } });
    expect(r.status).toBe("WARN");
    expect(r.problems[0]).toContain("3 hand-off posts were refused or failed in the last 6 h (401 x2, timeout x1)");
    expect(r.problems[0]).toContain("JOB_CONTINUE_SECRET");
  });

  it("checks that pg_cron actually runs the sweeper", () => {
    expect(assess({ sweeper_last_run: null }).status).toBe("WARN");
    expect(assess({ sweeper_last_run: { status: "failed", at: "2026-10-17T11:59:00+00:00" } }).status).toBe("FAIL");
    const stale = new Date(NOW - SWEEPER_STALE_MS - 1000).toISOString();
    expect(assess({ sweeper_last_run: { status: "succeeded", at: stale } }).problems).toEqual([expect.stringContaining("pg_cron isn't running it")]);
    const recent = new Date(NOW - SWEEPER_STALE_MS + 1000).toISOString();
    expect(assess({ sweeper_last_run: { status: "running", at: recent } }).status).toBe("OK");
  });
});
