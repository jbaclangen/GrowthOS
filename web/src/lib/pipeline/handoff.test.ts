import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../../../test/fake-supabase";
import { HANDOFF_ERROR, handOff, startJob } from "./handoff";
import { initialState } from "./steps";

const dispatchStep = vi.hoisted(() => vi.fn(async (): Promise<boolean> => true));
const afterCalls = vi.hoisted(() => [] as (() => Promise<unknown>)[]);
const admin = vi.hoisted(() => ({ db: null as unknown, throws: false }));

vi.mock("./dispatch", () => ({ dispatchStep }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => afterCalls.push(fn) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => {
    if (admin.throws) throw new Error("Missing or invalid environment variable: SUPABASE_SECRET_KEY");
    return admin.db;
  },
}));

const JOB = { id: "job-1", organizationId: "org-1" };
const queued = (worker: string) => ({ id: JOB.id, organization_id: JOB.organizationId, worker, status: "queued", output: initialState(worker) });

beforeEach(() => {
  dispatchStep.mockReset().mockResolvedValue(true);
  afterCalls.length = 0;
  admin.throws = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("handOff", () => {
  it("leaves the job alone when the step is accepted", async () => {
    const { db, tables } = fakeSupabase({ ai_jobs: [queued("website_plan")] });
    expect(await handOff(JOB, "scoring", db)).toBe(true);
    expect(dispatchStep).toHaveBeenCalledWith(JOB, "scoring", { db, resend: undefined });
    expect(tables.ai_jobs[0].status).toBe("queued");
  });

  it("fails the job at once when the step can't be handed on", async () => {
    const { db, tables } = fakeSupabase({ ai_jobs: [queued("website_plan")] });
    dispatchStep.mockResolvedValue(false);
    expect(await handOff(JOB, "scoring", db)).toBe(false);
    expect(tables.ai_jobs[0]).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "scoring" } });
  });

  it("passes a re-send on, and fails the job the same way when it can't be re-sent", async () => {
    const fake = fakeSupabase({ ai_jobs: [queued("website_plan")] });
    admin.db = fake.db;
    expect(await handOff(JOB, "scoring", undefined, { resend: true })).toBe(true);
    expect(dispatchStep).toHaveBeenCalledWith(JOB, "scoring", { db: undefined, resend: true });
    dispatchStep.mockResolvedValue(false);
    expect(await handOff(JOB, "scoring", undefined, { resend: true })).toBe(false);
    expect(fake.tables.ai_jobs[0]).toMatchObject({ status: "failed", error: HANDOFF_ERROR });
  });

  it("never throws", async () => {
    admin.throws = true;
    dispatchStep.mockResolvedValue(false);
    await expect(handOff(JOB, "scoring")).resolves.toBe(false);
    dispatchStep.mockRejectedValue(new Error("unexpected"));
    await expect(handOff(JOB, "scoring")).resolves.toBe(false);
  });
});

describe("startJob", () => {
  it("hands the job's first step on after the response", async () => {
    const fake = fakeSupabase({ ai_jobs: [queued("diagnosis_update")] });
    admin.db = fake.db;
    startJob({ ...JOB, worker: "diagnosis_update" });
    expect(dispatchStep).not.toHaveBeenCalled();
    await afterCalls[0]();
    expect(dispatchStep).toHaveBeenCalledWith(expect.objectContaining(JOB), "scoring", expect.anything());

    startJob({ ...JOB, worker: "website_evidence" });
    await afterCalls[1]();
    expect(dispatchStep).toHaveBeenLastCalledWith(expect.objectContaining(JOB), "crawling", expect.anything());
  });
});
