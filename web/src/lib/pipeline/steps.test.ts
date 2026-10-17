import { describe, expect, it } from "vitest";
import {
  STALE_JOB_MS,
  advanceState,
  canClaim,
  firstStep,
  initialState,
  isStale,
  lastProgressAt,
  nextStep,
  readState,
  staleFilter,
  stepsFor,
  type JobState,
} from "./steps";

describe("step sequences", () => {
  it("runs each worker's steps in order", () => {
    expect(stepsFor("website_evidence")).toEqual(["crawling", "profiling"]);
    expect(stepsFor("website_plan")).toEqual(["scoring", "planning", "writing"]);
    expect(stepsFor("website_intel")).toEqual(["crawling", "profiling", "scoring", "planning", "writing"]);
    expect(stepsFor("diagnosis_update")).toEqual(["scoring"]);
    // Unknown workers run the full analysis, as the single-invocation pipeline did.
    expect(stepsFor("something_else")).toEqual(stepsFor("website_intel"));
  });

  it("finds the first and next steps", () => {
    expect(firstStep("website_plan")).toBe("scoring");
    expect(nextStep("website_intel", "crawling")).toBe("profiling");
    expect(nextStep("website_intel", "planning")).toBe("writing");
    expect(nextStep("website_intel", "writing")).toBeNull();
    expect(nextStep("website_evidence", "profiling")).toBeNull();
    expect(nextStep("diagnosis_update", "scoring")).toBeNull();
    expect(nextStep("website_plan", "crawling")).toBeNull();
  });
});

describe("step state", () => {
  const now = new Date("2026-10-17T10:00:00.000Z");

  it("starts a job queued without an output at its first step", () => {
    expect(readState("website_intel", null, "2026-10-17T09:59:00.000Z")).toEqual({
      step: "crawling",
      step_state: "pending",
      step_started_at: "2026-10-17T09:59:00.000Z",
      claim: null,
    });
  });

  it("ignores finished and legacy outputs", () => {
    expect(readState("website_intel", { step: "done", report_id: "r" })).toBeNull();
    expect(readState("website_evidence", { step: "evidence_done", evidence: {} })).toBeNull();
    // Written by the single-invocation pipeline: no step_state.
    expect(readState("website_intel", { step: "scoring" })).toBeNull();
    // A step that isn't part of this worker's sequence.
    expect(readState("website_plan", { step: "crawling", step_state: "pending" })).toBeNull();
  });

  it("lets only a pending step that matches the request be claimed", () => {
    const pending = initialState("website_intel", now);
    expect(canClaim(pending)).toBe(true);
    expect(canClaim(pending, "crawling")).toBe(true);
    expect(canClaim(pending, "profiling")).toBe(false);
    expect(canClaim({ ...pending, step_state: "running", claim: "c1" }, "crawling")).toBe(false);
    expect(canClaim(null, "crawling")).toBe(false);
  });

  it("advances to the next step with the artifacts and a fresh progress time", () => {
    const running: JobState = { ...initialState("website_intel", now), step_state: "running", claim: "c1", digest: "pages" };
    const later = new Date(now.getTime() + 60_000);
    const next = advanceState(running, { evidence: { psi: null }, digest: undefined }, "profiling", later);
    expect(next).toMatchObject({ step: "profiling", step_state: "pending", claim: null, evidence: { psi: null } });
    expect(next.step_started_at).toBe(later.toISOString());
    // undefined artifacts are dropped when the output is stored as JSON.
    expect(JSON.parse(JSON.stringify(next)).digest).toBeUndefined();
    // A repeated continuation for the step that just ran is not claimable.
    expect(canClaim(readState("website_intel", next), "crawling")).toBe(false);
    expect(canClaim(readState("website_intel", next), "profiling")).toBe(true);
  });
});

describe("stale-job reaper", () => {
  const created = "2026-10-17T10:00:00.000Z";
  const t = (iso: string) => Date.parse(iso);

  it("measures from the current step's start, not the job's creation", () => {
    const job = { status: "running", created_at: created, output: { step: "writing", step_started_at: "2026-10-17T10:14:00.000Z" } };
    expect(lastProgressAt(job)).toBe(t("2026-10-17T10:14:00.000Z"));
    // 16 minutes after creation but 2 minutes into the step: healthy.
    expect(isStale(job, t("2026-10-17T10:16:00.000Z"))).toBe(false);
    expect(isStale(job, t("2026-10-17T10:14:00.000Z") + STALE_JOB_MS + 1)).toBe(true);
  });

  it("falls back to created_at for jobs without step progress", () => {
    const job = { status: "queued", created_at: created, output: null };
    expect(isStale(job, t(created) + STALE_JOB_MS)).toBe(false);
    expect(isStale(job, t(created) + STALE_JOB_MS + 1)).toBe(true);
  });

  it("never reaps finished jobs", () => {
    const job = { status: "succeeded", created_at: created, output: { step: "done" } };
    expect(isStale(job, t(created) + 10 * STALE_JOB_MS)).toBe(false);
  });

  it("builds the matching database filter", () => {
    expect(staleFilter("2026-10-17T10:00:00.000Z")).toBe(
      'output->>step_started_at.lt."2026-10-17T10:00:00.000Z",and(output->>step_started_at.is.null,created_at.lt."2026-10-17T10:00:00.000Z")',
    );
  });
});
