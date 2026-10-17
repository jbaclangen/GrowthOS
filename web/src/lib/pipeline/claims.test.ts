import { describe, expect, it } from "vitest";
import { fakeSupabase, type Row } from "../../../test/fake-supabase";
import { claimStep, failPendingStep, markResent, ownedUpdate } from "./claims";
import { advanceState, initialState, type JobState } from "./steps";

const ORG = "org-1";
const JOB = { id: "job-1", organizationId: ORG };
const T0 = new Date("2026-10-17T10:00:00.000Z");

function jobRow(output: unknown, status = "running"): Row {
  return { id: JOB.id, organization_id: ORG, worker: "website_intel", status, output, started_at: null, error: null };
}

const pending = (step: JobState["step"] = "crawling"): JobState => ({ ...initialState("website_intel", T0), step });
const runningFor = (state: JobState, claim: string): JobState => ({ ...state, step_state: "running", claim });

describe("claimStep", () => {
  it("lets only one of two invocations that read the same pending step claim it", async () => {
    const { db, tables } = fakeSupabase({ ai_jobs: [jobRow(pending(), "queued")] });
    const read = tables.ai_jobs[0].output;
    const job = { ...JOB, output: read, startedAt: null };
    const [a, b] = await Promise.all([
      claimStep(db, job, runningFor(pending(), "a")),
      claimStep(db, job, runningFor(pending(), "b")),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const row = tables.ai_jobs[0];
    expect(row.status).toBe("running");
    expect((row.output as JobState).claim).toBe(a ? "a" : "b");
    expect(row.started_at).toBe(T0.toISOString());
  });

  it("claims nothing for a step that is already running or has moved on", async () => {
    const { db } = fakeSupabase({ ai_jobs: [jobRow(runningFor(pending(), "first"))] });
    // A late continuation built from the state it read while the step was still pending.
    expect(await claimStep(db, { ...JOB, output: pending(), startedAt: null }, runningFor(pending(), "late"))).toBe(false);

    const advanced = fakeSupabase({ ai_jobs: [jobRow(pending("profiling"))] });
    expect(await claimStep(advanced.db, { ...JOB, output: pending(), startedAt: null }, runningFor(pending(), "late"))).toBe(false);
  });

  it("claims nothing on a finished job", async () => {
    const { db } = fakeSupabase({ ai_jobs: [jobRow(pending(), "failed")] });
    expect(await claimStep(db, { ...JOB, output: pending(), startedAt: null }, runningFor(pending(), "c"))).toBe(false);
  });

  it("claims a job queued without an output (older app version) once", async () => {
    const { db, tables } = fakeSupabase({ ai_jobs: [jobRow(null, "queued")] });
    const job = { ...JOB, output: null, startedAt: null };
    expect(await claimStep(db, job, runningFor(pending(), "a"))).toBe(true);
    expect(await claimStep(db, job, runningFor(pending(), "b"))).toBe(false);
    expect((tables.ai_jobs[0].output as JobState).claim).toBe("a");
  });
});

describe("ownedUpdate", () => {
  it("writes only for the invocation holding the claim", async () => {
    const { db, tables } = fakeSupabase({ ai_jobs: [jobRow(runningFor(pending(), "mine"))] });
    const next = advanceState(runningFor(pending(), "mine"), { digest: "pages" }, "profiling", T0);

    expect((await ownedUpdate(db, JOB, "other", { output: next })).data).toEqual([]);
    expect((await ownedUpdate(db, JOB, "mine", { output: next })).data).toHaveLength(1);
    // Advancing clears the claim, so a retried write matches nothing and the next step isn't queued twice.
    expect((await ownedUpdate(db, JOB, "mine", { output: next })).data).toEqual([]);
    expect(tables.ai_jobs[0].output).toMatchObject({ step: "profiling", step_state: "pending", claim: null, digest: "pages" });
  });

  it("writes nothing once the reaper has failed the job", async () => {
    const { db } = fakeSupabase({ ai_jobs: [jobRow(runningFor(pending(), "mine"), "failed")] });
    expect((await ownedUpdate(db, JOB, "mine", { status: "succeeded" })).data).toEqual([]);
  });

  it("reports a failed write", async () => {
    const { db, failWrites } = fakeSupabase({ ai_jobs: [jobRow(runningFor(pending(), "mine"))] });
    failWrites(1);
    expect((await ownedUpdate(db, JOB, "mine", { status: "succeeded" })).error).not.toBeNull();
  });
});

describe("failPendingStep", () => {
  it("fails a job whose step is still pending and drops its artifacts", async () => {
    const { db, tables } = fakeSupabase({ ai_jobs: [jobRow({ ...pending("profiling"), digest: "page text" })] });
    expect(await failPendingStep(db, JOB, "profiling", "The analysis couldn't continue. Run it again.")).toBe(true);
    expect(tables.ai_jobs[0]).toMatchObject({
      status: "failed",
      error: "The analysis couldn't continue. Run it again.",
      output: { step: "profiling" },
    });
    expect(tables.ai_jobs[0].finished_at).toEqual(expect.any(String));
  });

  it("leaves a step another invocation has claimed, another step, and finished jobs alone", async () => {
    const claimed = fakeSupabase({ ai_jobs: [jobRow(runningFor(pending("profiling"), "c"))] });
    expect(await failPendingStep(claimed.db, JOB, "profiling", "x")).toBe(false);
    expect(claimed.tables.ai_jobs[0].status).toBe("running");

    const other = fakeSupabase({ ai_jobs: [jobRow(pending("scoring"))] });
    expect(await failPendingStep(other.db, JOB, "profiling", "x")).toBe(false);

    const done = fakeSupabase({ ai_jobs: [jobRow({ step: "done" }, "succeeded")] });
    expect(await failPendingStep(done.db, JOB, "done", "x")).toBe(false);
    expect(done.tables.ai_jobs[0].status).toBe("succeeded");
  });
});

describe("markResent", () => {
  it("marks a pending step once per value of resent_at", async () => {
    const state = pending("scoring");
    const { db, tables } = fakeSupabase({ ai_jobs: [jobRow(state)] });
    expect(await markResent(db, JOB, state, "2026-10-17T10:02:00.000Z")).toBe(true);
    // A second page that read the same state loses the race.
    expect(await markResent(db, JOB, state, "2026-10-17T10:02:00.500Z")).toBe(false);
    const marked = tables.ai_jobs[0].output as JobState;
    expect(marked.resent_at).toBe("2026-10-17T10:02:00.000Z");
    expect(await markResent(db, JOB, marked, "2026-10-17T10:03:30.000Z")).toBe(true);
  });

  it("doesn't mark a step that has been claimed meanwhile", async () => {
    const state = pending("scoring");
    const { db } = fakeSupabase({ ai_jobs: [jobRow(runningFor(state, "c"))] });
    expect(await markResent(db, JOB, state, "2026-10-17T10:02:00.000Z")).toBe(false);
  });
});
