import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase, type Row } from "../../../test/fake-supabase";
import { RESEND_AFTER_MS, STALE_JOB_ERROR, STALE_JOB_MS, failStaleJobs, resendDue, superviseJobs } from "./jobs";
import { initialState, type JobState } from "./steps";

const fake = vi.hoisted(() => ({ current: null as FakeSupabase | null }));
const handOff = vi.hoisted(() => vi.fn(async () => true));
const afterCalls = vi.hoisted(() => [] as (() => Promise<unknown>)[]);

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: () => fake.current!.db }));
vi.mock("./handoff", () => ({ handOff }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => afterCalls.push(fn) }));

const ORG = "org-1";
const NOW = Date.parse("2026-10-17T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function job(id: string, fields: Partial<Row>): Row {
  return { id, organization_id: ORG, worker: "website_intel", status: "running", created_at: ago(60 * 60 * 1000), output: null, ...fields };
}
const stepAt = (step: JobState["step"], startedAgo: number, extra: Partial<JobState> = {}): JobState => ({
  ...initialState("website_intel"),
  step,
  step_started_at: ago(startedAgo),
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  handOff.mockClear();
  afterCalls.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("failStaleJobs (the real reaper filter)", () => {
  it("fails jobs whose last progress is older than the limit, and only those", async () => {
    fake.current = fakeSupabase({
      ai_jobs: [
        // 16 minutes after creation but 2 minutes into the current step: healthy.
        job("healthy", { output: stepAt("writing", 2 * 60 * 1000, { step_state: "running", claim: "c" }) }),
        job("stuck", { output: stepAt("scoring", STALE_JOB_MS + 1000, { digest: "page text" }) }),
        // Queued by an older version: no step progress, measured from created_at.
        job("legacy-old", { status: "queued", output: null, created_at: ago(STALE_JOB_MS + 1000) }),
        job("legacy-new", { status: "queued", output: null, created_at: ago(60 * 1000) }),
        job("done", { status: "succeeded", output: { step: "done" }, created_at: ago(10 * STALE_JOB_MS) }),
        job("other-org", { organization_id: "org-2", output: stepAt("scoring", STALE_JOB_MS + 1000) }),
      ],
    });
    await failStaleJobs(ORG);
    const status = Object.fromEntries(fake.current.tables.ai_jobs.map((r) => [r.id, r.status]));
    expect(status).toEqual({
      healthy: "running",
      stuck: "failed",
      "legacy-old": "failed",
      "legacy-new": "queued",
      done: "succeeded",
      "other-org": "running",
    });
    const stuck = fake.current.tables.ai_jobs.find((r) => r.id === "stuck")!;
    expect(stuck.error).toBe(STALE_JOB_ERROR);
    // The step artifacts (crawled page text) aren't kept on a failed job.
    expect(stuck.output).toBeNull();
  });
});

describe("resendDue", () => {
  it("re-sends a step still pending after a minute, once a minute", async () => {
    fake.current = fakeSupabase({
      ai_jobs: [
        job("lost", { output: stepAt("profiling", RESEND_AFTER_MS + 1000) }),
        job("just-queued", { output: stepAt("profiling", 5 * 1000) }),
        job("claimed", { output: stepAt("profiling", RESEND_AFTER_MS + 1000, { step_state: "running", claim: "c" }) }),
        job("failed", { status: "failed", output: stepAt("profiling", RESEND_AFTER_MS + 1000) }),
      ],
    });
    expect(await resendDue(ORG, fake.current.db, NOW)).toEqual([{ id: "lost", organizationId: ORG, step: "profiling" }]);
    // The next poll, seconds later, doesn't send it again.
    expect(await resendDue(ORG, fake.current.db, NOW + 4000)).toEqual([]);
    // A minute later it is still pending, so it is sent again (and the step queued just before is now due too).
    expect(await resendDue(ORG, fake.current.db, NOW + RESEND_AFTER_MS + 1000)).toEqual([
      { id: "lost", organizationId: ORG, step: "profiling" },
      { id: "just-queued", organizationId: ORG, step: "profiling" },
    ]);
  });
});

describe("superviseJobs", () => {
  it("hands the lost step on after the response", async () => {
    fake.current = fakeSupabase({ ai_jobs: [job("lost", { output: stepAt("planning", RESEND_AFTER_MS + 1000) })] });
    await superviseJobs(ORG);
    expect(handOff).not.toHaveBeenCalled();
    expect(afterCalls).toHaveLength(1);
    await afterCalls[0]();
    // As a re-send: in database mode Postgres re-posts the stored dispatch.
    expect(handOff).toHaveBeenCalledWith({ id: "lost", organizationId: ORG, step: "planning" }, "planning", undefined, { resend: true });
  });

  it("schedules nothing when no step is waiting", async () => {
    fake.current = fakeSupabase({ ai_jobs: [job("fine", { output: stepAt("planning", 1000) })] });
    await superviseJobs(ORG);
    expect(afterCalls).toHaveLength(0);
  });
});
