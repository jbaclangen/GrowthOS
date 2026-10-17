import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase, type Row } from "../../../test/fake-supabase";
import { POST } from "@/app/api/jobs/continue/route";
import { handOff } from "./handoff";
import { superviseJobs } from "./jobs";
import { initialState, type JobState } from "./steps";

// End to end through the real pieces, with no network and no model calls: handOff -> dispatchStep -> the continue
// route (HMAC check, 202, after()) -> runAnalysisJob (claim, step, advance) -> the next hand-off. "Invocations" are
// the after() callbacks, run one by one. Direct mode routes the app's fetch into the route; database mode plays
// pg_net by posting each recorded job_dispatches row to the route, and checks that the app never calls itself.

const state = vi.hoisted(() => ({ fake: null as FakeSupabase | null, after: [] as (() => unknown)[] }));
const runWorkerJson = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: () => state.fake!.db }));
vi.mock("@/lib/ai/router", () => ({ runWorkerJson }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => state.after.push(fn) }));

const ORG = "0b9a3c1e-7f00-4d8e-9a11-5b7c2d3e4f60";
const JOB = "6f1c2a7e-1d1b-4c55-9a52-3f3d1b2c4e5f";
const PROFILE = "profile-1";
const REF = { id: JOB, organizationId: ORG };
const URL_ = "https://app.example.com/api/jobs/continue";
// A valid business profile (profileSchema), so the scoring step gets as far as its own model call.
const INTEL = {
  company_name: "Example Plumbing",
  industry: "Plumbing",
  summary: "A plumber in Austin.",
  services: ["Repairs"],
  target_customers: "Homeowners",
  locations: ["Austin"],
  offers: "",
  unique_value: "",
  brand_voice: { tone: "Friendly", traits: ["plain"] },
  likely_competitors: [],
  strengths: [],
  gaps: [],
  regulated: { is_regulated: false, area: "", considerations: [] },
};
const EVIDENCE = { signals: null, psi: null, psiError: null, pages: [] };
const STOP = "stopped by the test after the scoring hand-off";

const fetchMock = vi.fn();

function setup() {
  state.fake = fakeSupabase(
    {
      ai_jobs: [
        {
          id: JOB,
          organization_id: ORG,
          worker: "website_intel",
          status: "queued",
          input: { businessProfileId: PROFILE, websiteUrl: "https://example.com" },
          output: { ...initialState("website_intel"), step: "profiling", digest: "page text", evidence: EVIDENCE },
          created_at: new Date().toISOString(),
          started_at: null,
        },
      ],
      business_profiles: [{ id: PROFILE, organization_id: ORG, goals: null, service_area: null, current_tools: null }],
      job_dispatches: [],
    },
    { job_dispatches: { attempts: 1 } },
    {
      unique: { job_dispatches: [["job_id", "step"]] },
      rpc: {
        // Plays resend_job_dispatch: re-posts the stored row (here: marks it for delivery) while the step is pending,
        // unless its last post was refused (row.refused plays job_dispatch_failed).
        resend_job_dispatch: (args, tables) => {
          const row = tables.job_dispatches.find((d) => d.job_id === args.p_job_id && d.organization_id === args.p_organization_id && d.step === args.p_step);
          if (!row) return "missing";
          const job = tables.ai_jobs.find((j) => j.id === args.p_job_id)!;
          const out = job.output as JobState | null;
          if (!["queued", "running"].includes(job.status as string) || out?.step !== args.p_step || out?.step_state !== "pending") return "not_pending";
          if (row.refused) return "failed";
          row.attempts = Number(row.attempts) + 1;
          reposted.push(row);
          return "posted";
        },
      },
    },
  );
  return state.fake;
}
let reposted: Row[] = [];
const job = () => state.fake!.tables.ai_jobs.find((r) => r.id === JOB)!;

const post = (body: unknown) =>
  POST(new Request(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

// Runs every queued after() callback, including the ones they queue.
async function drain() {
  while (state.after.length) await state.after.shift()!();
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");
  vi.stubEnv("JOB_CONTINUE_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("JOB_DISPATCH", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  state.after.length = 0;
  reposted = [];
  // Profiling succeeds; the scoring step's model call stops the run, which proves the step ran.
  runWorkerJson.mockReset().mockResolvedValueOnce(INTEL).mockRejectedValue(new Error(STOP));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("direct mode (local development)", () => {
  beforeEach(() => {
    // The dev server: no VERCEL, not a production build (PORT unset, so it posts to NEXT_PUBLIC_APP_URL).
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "");
    // The app's own POST lands in the continue route, as on the dev server.
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      expect(url).toBe(URL_);
      return post(JSON.parse(String(init.body)));
    });
  });

  it("runs each step in its own invocation, handing the next one on through the route", async () => {
    setup();
    expect(await handOff(REF, "profiling")).toBe(true);
    // The route only accepted it: the step runs in its after().
    expect(job().output).toMatchObject({ step: "profiling", step_state: "pending" });
    await drain();

    const steps = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init.body)).step);
    expect(steps).toEqual(["profiling", "scoring"]);
    expect(runWorkerJson).toHaveBeenCalledTimes(2);
    expect(job()).toMatchObject({ status: "failed", error: STOP, output: { step: "scoring" } });
    expect(state.fake!.tables.job_dispatches).toHaveLength(0);
  });

  it("runs a step once however often it is handed over, and the route refuses a forged token", async () => {
    setup();
    runWorkerJson.mockReset().mockResolvedValueOnce(INTEL).mockImplementation(() => new Promise(() => {}));
    await handOff(REF, "profiling");
    await handOff(REF, "profiling");
    expect((await post({ jobId: JOB, step: "profiling", token: "forged" })).status).toBe(401);
    // Two profiling invocations: one claims and runs, the other finds the step taken.
    await state.after.shift()!();
    await state.after.shift()!();
    expect(runWorkerJson).toHaveBeenCalledTimes(1);
    expect(job().output).toMatchObject({ step: "scoring", step_state: "pending" });
  });

  it("fails the job at once when the route keeps refusing (e.g. Vercel's 508 loop detection)", async () => {
    vi.useFakeTimers();
    setup();
    fetchMock.mockImplementation(async () => new Response(null, { status: 508 }));
    const result = handOff(REF, "profiling");
    await vi.runAllTimersAsync();
    expect(await result).toBe(false);
    expect(job()).toMatchObject({ status: "failed", error: "The analysis couldn't continue. Run it again.", output: { step: "profiling" } });
    vi.useRealTimers();
  });
});

describe("database mode (production on Vercel)", () => {
  beforeEach(() => vi.stubEnv("VERCEL", "1"));

  it("is used by a production build even when Vercel doesn't expose VERCEL", async () => {
    vi.stubEnv("VERCEL", "");
    setup();
    expect(await handOff(REF, "profiling")).toBe(true);
    expect(state.fake!.tables.job_dispatches).toEqual([expect.objectContaining({ job_id: JOB, step: "profiling" })]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Plays pg_net: posts every recorded hand-off not yet delivered (and any re-posts) to the route.
  async function deliver(delivered: Set<unknown>) {
    for (const row of [...state.fake!.tables.job_dispatches.filter((r) => !delivered.has(r.id)), ...reposted.splice(0)]) {
      delivered.add(row.id);
      expect(row.url).toBe(URL_);
      expect((await post({ jobId: row.job_id, step: row.step, token: row.token })).status).toBe(202);
    }
  }

  it("records every hand-off for Postgres to send, and the app never calls itself", async () => {
    setup();
    const delivered = new Set<unknown>();
    expect(await handOff(REF, "profiling")).toBe(true);
    await deliver(delivered);
    await drain();
    await deliver(delivered);
    await drain();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.fake!.tables.job_dispatches.map((d) => [d.organization_id, d.job_id, d.step])).toEqual([
      [ORG, JOB, "profiling"],
      [ORG, JOB, "scoring"],
    ]);
    expect(runWorkerJson).toHaveBeenCalledTimes(2);
    expect(job()).toMatchObject({ status: "failed", error: STOP, output: { step: "scoring" } });
  });

  it("re-sends a lost step from the report page's poll by having Postgres re-post it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-10-17T12:00:00.000Z"));
    setup();
    await handOff(REF, "profiling");
    // The first post was lost: the step is still pending a minute later.
    vi.setSystemTime(Date.parse("2026-10-17T12:01:30.000Z"));
    (job().output as JobState).step_started_at = "2026-10-17T12:00:00.000Z";
    await superviseJobs(ORG);
    await drain();
    expect(state.fake!.rpcCalls).toEqual([{ name: "resend_job_dispatch", args: { p_organization_id: ORG, p_job_id: JOB, p_step: "profiling" } }]);
    expect(reposted).toHaveLength(1);
    expect(state.fake!.tables.job_dispatches).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.useRealTimers();

    // The re-post runs the step as the first post would have.
    await deliver(new Set(state.fake!.tables.job_dispatches.map((d) => d.id)));
    await state.after.shift()!();
    expect(job().output).toMatchObject({ step: "scoring", step_state: "pending" });
  });

  it("fails the job, instead of waiting for the reaper, when the route refused Postgres's post", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-10-17T12:00:00.000Z"));
    setup();
    await handOff(REF, "profiling");
    // pg_net got a 401 (the deployment signs with another key): the step is still pending a minute later.
    state.fake!.tables.job_dispatches[0].refused = true;
    vi.setSystemTime(Date.parse("2026-10-17T12:01:30.000Z"));
    (job().output as JobState).step_started_at = "2026-10-17T12:00:00.000Z";
    await superviseJobs(ORG);
    await drain();
    vi.useRealTimers();
    expect(reposted).toHaveLength(0);
    expect(state.fake!.tables.job_dispatches).toHaveLength(1);
    expect(job()).toMatchObject({ status: "failed", error: "The analysis couldn't continue. Run it again.", output: { step: "profiling" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails the job at once when the hand-off can't be recorded (migration not applied)", async () => {
    setup().failWrites(1, (w) => w.table === "job_dispatches", { code: "PGRST205", message: "Could not find the table 'public.job_dispatches'" });
    expect(await handOff(REF, "profiling")).toBe(false);
    expect(job()).toMatchObject({ status: "failed", error: "The analysis couldn't continue. Run it again.", output: { step: "profiling" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
