import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase, type Row, type Write } from "../../../test/fake-supabase";
import { HANDOFF_ERROR } from "./handoff";
import { initialState, type JobState } from "./steps";
import { runAnalysisJob } from "./website-intel";

// runAnalysisJob's orchestration (claim, run, advance, hand off) against an in-memory database. The step itself is
// "profiling", with the model call stubbed.

const fake = vi.hoisted(() => ({ current: null as FakeSupabase | null, adminThrows: false }));
const dispatchStep = vi.hoisted(() => vi.fn(async (): Promise<boolean> => true));
const runWorkerJson = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => {
    if (fake.adminThrows) throw new Error("Missing or invalid environment variable: SUPABASE_SECRET_KEY");
    return fake.current!.db;
  },
}));
vi.mock("./dispatch", () => ({ dispatchStep }));
vi.mock("@/lib/ai/router", () => ({ runWorkerJson }));
vi.mock("next/server", () => ({ after: () => {} }));

const ORG = "org-1";
const JOB = "job-1";
const PROFILE = "profile-1";
const SESSION = "session-1";
const REF = { id: JOB, organizationId: ORG };

const INTEL = {
  company_name: "Example Plumbing",
  industry: "Plumbing",
  services: ["Repairs"],
  target_customers: ["Homeowners"],
  locations: ["Austin"],
  likely_competitors: [],
  offers: [],
  brand_voice: { tone: "Friendly", traits: ["plain"] },
};
const EVIDENCE = { signals: null, psi: null, psiError: null, pages: [] };

function profilingState(worker: string): JobState {
  return { ...initialState(worker), step: "profiling", digest: "page text", evidence: EVIDENCE };
}

function setup(worker = "website_intel", extra: Record<string, Row[]> = {}) {
  fake.current = fakeSupabase({
    ai_jobs: [
      {
        id: JOB,
        organization_id: ORG,
        worker,
        status: "running",
        input: { businessProfileId: PROFILE, websiteUrl: "https://example.com", sessionId: SESSION },
        output: profilingState(worker),
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      },
    ],
    business_profiles: [{ id: PROFILE, organization_id: ORG, goals: null, service_area: null, current_tools: null }],
    ...extra,
  }, { ai_jobs: { status: "queued", output: null, started_at: null } });
  return fake.current;
}
const jobRow = (id = JOB) => fake.current!.tables.ai_jobs.find((r) => r.id === id)!;
const isAdvance = (w: Write) => w.table === "ai_jobs" && (w.values as { output?: { step?: string } }).output?.step === "scoring";

beforeEach(() => {
  fake.adminThrows = false;
  dispatchStep.mockReset().mockResolvedValue(true);
  runWorkerJson.mockReset().mockResolvedValue(INTEL);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("runAnalysisJob", () => {
  it("runs a pending step once, however often it is handed over, then hands the next step on", async () => {
    setup();
    await Promise.all([runAnalysisJob(JOB, "profiling"), runAnalysisJob(JOB, "profiling")]);
    expect(runWorkerJson).toHaveBeenCalledTimes(1);
    expect(dispatchStep).toHaveBeenCalledTimes(1);
    expect(dispatchStep).toHaveBeenCalledWith(REF, "scoring", expect.anything());
    expect(jobRow()).toMatchObject({ status: "running", output: { step: "scoring", step_state: "pending", claim: null, evidence: EVIDENCE } });
    expect((jobRow().output as JobState).digest).toBeUndefined();
  });

  it("ignores a continuation for a step that isn't the pending one", async () => {
    setup();
    await runAnalysisJob(JOB, "crawling");
    await runAnalysisJob(JOB, "scoring");
    expect(runWorkerJson).not.toHaveBeenCalled();
    expect(jobRow().output).toMatchObject({ step: "profiling", step_state: "pending" });
  });

  it("fails the job at once, with what happened, when the next step's hand-off isn't accepted", async () => {
    setup();
    dispatchStep.mockResolvedValue(false);
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow()).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "scoring" } });
  });

  it("records a failed step and drops its artifacts", async () => {
    setup();
    runWorkerJson.mockRejectedValue(new Error("OpenRouter: provider error"));
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow()).toMatchObject({ status: "failed", error: "OpenRouter: provider error", output: { step: "profiling" } });
    expect(dispatchStep).not.toHaveBeenCalled();
  });

  it("retries a failed write of the next step once", async () => {
    setup().failWrites(1, isAdvance);
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow().output).toMatchObject({ step: "scoring", step_state: "pending" });
    expect(dispatchStep).toHaveBeenCalledWith(REF, "scoring", expect.anything());
  });

  it("fails the job when the next step can't be written", async () => {
    setup().failWrites(2, isAdvance);
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow()).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "profiling" } });
    expect(dispatchStep).not.toHaveBeenCalled();
  });

  it("never throws, even when the database client can't be created", async () => {
    setup();
    fake.adminThrows = true;
    await expect(runAnalysisJob(JOB, "profiling")).resolves.toBeUndefined();
  });

  it("queues the plan at its first step when the evidence is in, and fails it if its hand-off isn't accepted", async () => {
    setup("website_evidence", {
      onboarding_sessions: [
        {
          id: SESSION,
          organization_id: ORG,
          business_profile_id: PROFILE,
          status: "completed",
          evidence_job_id: JOB,
          plan_job_id: null,
          created_by: "user-1",
        },
      ],
    });
    dispatchStep.mockResolvedValue(false);
    await runAnalysisJob(JOB, "profiling");

    expect(jobRow()).toMatchObject({ status: "succeeded", output: { step: "evidence_done", evidence: EVIDENCE } });
    const session = fake.current!.tables.onboarding_sessions[0];
    const plan = jobRow(session.plan_job_id as string);
    expect(plan.worker).toBe("website_plan");
    expect(dispatchStep).toHaveBeenCalledWith(expect.objectContaining({ id: plan.id, organizationId: ORG }), "scoring", expect.anything());
    // Not left queued for ten minutes: failed now, with an accurate message.
    expect(plan).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "scoring" } });
  });

  it("queues the plan with its first step as the progress the report shows", async () => {
    setup("website_evidence", {
      onboarding_sessions: [
        { id: SESSION, organization_id: ORG, business_profile_id: PROFILE, status: "skipped", evidence_job_id: JOB, plan_job_id: null },
      ],
    });
    await runAnalysisJob(JOB, "profiling");
    const plan = jobRow(fake.current!.tables.onboarding_sessions[0].plan_job_id as string);
    expect(plan).toMatchObject({ output: { step: "scoring", step_state: "pending", claim: null } });
  });
});
