import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DispatchHealth } from "@/lib/pipeline/dispatch-health";

// The job_handoff check of the dev-only health route. Every environment shares one database and production hands
// steps on through it, so the database side (job_dispatch_health) is checked whatever this server's own mode is.

const rpc = vi.hoisted(() => ({ result: { data: null as unknown, error: null as { message: string } | null } }));

vi.mock("next/server", () => ({
  connection: async () => {},
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
vi.mock("@/lib/integrations/openrouter", () => ({ keyInfo: async () => ({ is_free_tier: false, limit_remaining: null, expires_at: null }) }));
vi.mock("@/lib/integrations/n8n", () => ({ listWorkflows: async () => [] }));
vi.mock("@/lib/integrations/google", () => ({ pageSpeed: async () => ({ scores: { performance: 1 } }) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ select: async () => ({ error: null, count: 1 }) }),
    rpc: async (name: string) => (name === "job_dispatch_health" ? rpc.result : { data: null, error: { message: "unknown" } }),
  }),
}));

const { GET } = await import("./route");

const HEALTHY: DispatchHealth = {
  pg_net: "0.20.0",
  pg_cron: "1.6.4",
  worker_running: true,
  sweeper_scheduled: true,
  sweeper_last_run: { status: "succeeded", at: new Date().toISOString() },
  dispatches_last_day: 4,
  failed_posts_last_6h: 0,
  failed_posts_by_status: {},
  unanswered_posts: 0,
  stuck_in_queue: 0,
};
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("PORT", "3000");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("JOB_DISPATCH", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");
  vi.stubEnv("JOB_CONTINUE_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  // The continue route answers an empty request with 400.
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 400 }));
  vi.stubGlobal("fetch", fetchMock);
  rpc.result = { data: HEALTHY, error: null };
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function handoff(): Promise<{ ok: boolean; detail: string }> {
  const body = (await (await GET()).json()) as { job_handoff: { ok: boolean; detail: string } };
  return body.job_handoff;
}

describe("GET /api/health/integrations, job_handoff", () => {
  it("reports the mode and checks the database side even in direct mode", async () => {
    const r = await handoff();
    expect(r.ok).toBe(true);
    expect(r.detail).toContain("direct mode");
    expect(r.detail).toContain("http://localhost:3000/api/jobs/continue reachable");
    expect(r.detail).toContain("pg_net 0.20.0 (worker running)");
  });

  it("fails on a developer machine when the shared database lacks the migration", async () => {
    rpc.result = { data: null, error: { message: "Could not find the function public.job_dispatch_health" } };
    const r = await handoff();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("apply the job_dispatches migration");
  });

  it("fails when pg_net, pg_cron or the sweeper is missing", async () => {
    rpc.result = { data: { ...HEALTHY, pg_cron: null, sweeper_scheduled: false }, error: null };
    const r = await handoff();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("the pg_cron extension isn't installed");
    expect(r.detail).toContain("the braventa-job-dispatch-sweeper schedule is missing");
  });

  it("is not ok when posts were refused (e.g. a key mismatch) or never answered", async () => {
    rpc.result = { data: { ...HEALTHY, failed_posts_last_6h: 2, failed_posts_by_status: { "401": 2 } }, error: null };
    let r = await handoff();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("WARN");
    expect(r.detail).toContain("401 x2");

    rpc.result = { data: { ...HEALTHY, unanswered_posts: 1 }, error: null };
    r = await handoff();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("FAIL");
    expect(r.detail).toContain("select net.worker_restart();");
  });

  it("in database mode, needs the public https URL Postgres posts to", async () => {
    vi.stubEnv("JOB_DISPATCH", "database");
    let r = await handoff();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("https");

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    r = await handoff();
    expect(r.ok).toBe(true);
    expect(r.detail).toContain("database mode");
    expect(fetchMock).toHaveBeenLastCalledWith("https://app.example.com/api/jobs/continue", expect.objectContaining({ body: "{}" }));
  });
});
