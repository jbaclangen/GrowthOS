import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase, type Row } from "../../../test/fake-supabase";
import { continueKey, signContinue, verifyContinue } from "./continue-token";
import { continueUrl, databaseContinueUrl, dispatchMode, dispatchStep, retryable, retryableDbError, type ResendResult } from "./dispatch";

const JOB_ID = "6f1c2a7e-1d1b-4c55-9a52-3f3d1b2c4e5f";
const ORG = "0b9a3c1e-7f00-4d8e-9a11-5b7c2d3e4f60";
const JOB = { id: JOB_ID, organizationId: ORG };
const fetchMock = vi.fn();
const admin = vi.hoisted(() => ({ db: null as unknown, throws: false }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => {
    if (admin.throws) throw new Error("Missing or invalid environment variable: SUPABASE_SECRET_KEY");
    return admin.db;
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");
  vi.stubEnv("JOB_CONTINUE_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("JOB_DISPATCH", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  fetchMock.mockReset();
  admin.db = null;
  admin.throws = false;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const status = (code: number) => new Response(null, { status: code });

// Runs dispatchStep to completion, skipping the waits between attempts.
async function dispatch(step = "profiling", opts?: Parameters<typeof dispatchStep>[2]) {
  const result = dispatchStep(JOB, step, opts);
  await vi.runAllTimersAsync();
  return result;
}

// Everything logged, as one string, to check that no token ever reaches the logs.
function logged(): string {
  const calls = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.info).mock.calls];
  return calls.map((args) => args.map((a) => (a instanceof Error ? `${a.message} ${a.stack}` : JSON.stringify(a) ?? String(a))).join(" ")).join("\n");
}

describe("dispatchMode", () => {
  it("uses the database on Vercel and posts directly everywhere else", () => {
    expect(dispatchMode()).toBe("direct");
    vi.stubEnv("VERCEL", "1");
    expect(dispatchMode()).toBe("database");
  });

  it("lets JOB_DISPATCH override the default either way", () => {
    vi.stubEnv("JOB_DISPATCH", "database");
    expect(dispatchMode()).toBe("database");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("JOB_DISPATCH", "direct");
    expect(dispatchMode()).toBe("direct");
  });

  it("uses the database for any production build with a public https URL, even without VERCEL", () => {
    // Vercel sets VERCEL=1 only while the project exposes system environment variables; production must not fall back
    // to calling itself (HTTP 508) when that setting is off or the app runs with `next start` elsewhere.
    vi.stubEnv("NODE_ENV", "production");
    expect(dispatchMode()).toBe("database");
    // A production build on a developer machine (`next start` on localhost) still posts directly.
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(dispatchMode()).toBe("direct");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not a url");
    expect(dispatchMode()).toBe("direct");
    // The dev server posts directly whatever its public URL.
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    expect(dispatchMode()).toBe("direct");
  });

  it("falls back to the host's default, and says so, when JOB_DISPATCH is invalid", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("JOB_DISPATCH", "db");
    expect(dispatchMode()).toBe("database");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("JOB_DISPATCH"));
  });
});

describe("continueUrl", () => {
  it("uses the deployment's public URL outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PORT", "3000");
    expect(continueUrl()).toBe("https://app.example.com/api/jobs/continue");
  });

  it("uses the port the dev server actually listens on in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "3002");
    expect(continueUrl()).toBe("http://localhost:3002/api/jobs/continue");
  });

  it("takes an explicit origin (the local pipeline script)", () => {
    expect(continueUrl("http://localhost:3006")).toBe("http://localhost:3006/api/jobs/continue");
  });
});

describe("databaseContinueUrl", () => {
  it("is always the public URL, even in development, and must be https", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "3002");
    expect(databaseContinueUrl()).toBe("https://app.example.com/api/jobs/continue");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(() => databaseContinueUrl()).toThrow(/https/);
  });
});

describe("dispatchStep, direct mode", () => {
  it("returns true once the route accepts the step", async () => {
    fetchMock.mockResolvedValueOnce(status(202));
    expect(await dispatch()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://app.example.com/api/jobs/continue");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ jobId: JOB_ID, step: "profiling" });
    expect(verifyContinue(continueKey(), JOB_ID, "profiling", body.token)).toBe(true);
    expect(init.redirect).toBe("manual");
  });

  it("retries timeouts, rate limits, server errors and network failures", async () => {
    fetchMock.mockResolvedValueOnce(status(503)).mockRejectedValueOnce(new Error("socket hang up")).mockResolvedValueOnce(status(202));
    expect(await dispatch()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(status(429)).mockResolvedValueOnce(status(408)).mockResolvedValueOnce(status(202));
    expect(await dispatch()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after three failed attempts (the 508 Vercel answers a chain of self-calls included)", async () => {
    fetchMock.mockResolvedValue(status(508));
    expect(await dispatch()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops at once on a refusal that a retry won't change", async () => {
    for (const code of [307, 401, 404]) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(status(code));
      expect(await dispatch()).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("returns false without throwing when the signing key is invalid", async () => {
    vi.stubEnv("JOB_CONTINUE_SECRET", "too-short");
    await expect(dispatch()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false without throwing when the app URL is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not a url");
    await expect(dispatch()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("always posts directly to an explicit origin (the local pipeline script), even on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    fetchMock.mockResolvedValueOnce(status(202));
    expect(await dispatch("crawling", { origin: "http://localhost:3006" })).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3006/api/jobs/continue");
  });
});

describe("dispatchStep, database mode", () => {
  let fake: FakeSupabase;
  // Plays resend_job_dispatch for a job still waiting for the step: a row marked refused has failed for good.
  const resend = vi.fn((args: Row, tables: Record<string, Row[]>): ResendResult | null => {
    const row = (tables.job_dispatches ?? []).find((d) => d.job_id === args.p_job_id && d.organization_id === args.p_organization_id && d.step === args.p_step);
    if (!row) return "missing";
    if (row.refused) return "failed";
    row.attempts = Number(row.attempts) + 1;
    return "posted";
  });

  beforeEach(() => {
    vi.stubEnv("VERCEL", "1");
    resend.mockClear();
    fake = fakeSupabase({ job_dispatches: [] }, { job_dispatches: { attempts: 1 } }, {
      unique: { job_dispatches: [["job_id", "step"]] },
      rpc: { resend_job_dispatch: resend },
    });
    admin.db = fake.db;
  });

  it("records the hand-off for Postgres to send, scoped to the job's organization, and never posts to itself", async () => {
    expect(await dispatch("scoring")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.tables.job_dispatches).toHaveLength(1);
    const row = fake.tables.job_dispatches[0];
    expect(row).toMatchObject({
      organization_id: ORG,
      job_id: JOB_ID,
      step: "scoring",
      url: "https://app.example.com/api/jobs/continue",
    });
    // The token the route will check, and the shape the table's check constraint requires.
    expect(row.token).toBe(signContinue(continueKey(), JOB_ID, "scoring"));
    expect(row.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(row.url).toMatch(/^https:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?\/api\/jobs\/continue$/);
  });

  it("uses the client it is given (the pipeline's service client)", async () => {
    const other = fakeSupabase({ job_dispatches: [] });
    admin.throws = true;
    expect(await dispatch("planning", { db: other.db })).toBe(true);
    expect(other.tables.job_dispatches[0]).toMatchObject({ job_id: JOB_ID, step: "planning" });
  });

  it("treats a hand-off that is already recorded as accepted", async () => {
    expect(await dispatch("scoring")).toBe(true);
    expect(await dispatch("scoring")).toBe(true);
    expect(fake.tables.job_dispatches).toHaveLength(1);
  });

  it("retries a dropped connection, then records the hand-off", async () => {
    fake.failWrites(2);
    expect(await dispatch("scoring")).toBe(true);
    expect(fake.tables.job_dispatches).toHaveLength(1);
  });

  it("gives up after three dropped connections", async () => {
    fake.failWrites(3);
    expect(await dispatch("scoring")).toBe(false);
    expect(fake.tables.job_dispatches).toHaveLength(0);
  });

  it("stops at once when the table is missing (migration not applied) or the write is refused", async () => {
    for (const code of ["PGRST205", "42501", "23503", "23514"]) {
      fake.failWrites(1, undefined, { code, message: `refused (${code})` });
      expect(await dispatch("scoring")).toBe(false);
      fake.failWrites(0);
    }
    expect(fake.tables.job_dispatches).toHaveLength(0);
  });

  it("never logs the token, even when the database repeats the failing row", async () => {
    const token = signContinue(continueKey(), JOB_ID, "scoring");
    fake.failWrites(1, undefined, {
      code: "23514",
      message: 'new row for relation "job_dispatches" violates check constraint "job_dispatches_url_check"',
      details: `Failing row contains (1, ${ORG}, ${JOB_ID}, scoring, https://app.example.com/api/jobs/continue, ${token}, 0).`,
    });
    expect(await dispatch("scoring")).toBe(false);
    fake.failWrites(3);
    expect(await dispatch("scoring")).toBe(false);
    expect(logged()).toContain("job_dispatches_url_check");
    expect(logged()).not.toContain(token);
  });

  it("refuses a non-https public URL: Postgres can't reach it", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(await dispatch("scoring")).toBe(false);
    expect(fake.tables.job_dispatches).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false without throwing when the service client can't be created", async () => {
    admin.throws = true;
    await expect(dispatch("scoring")).resolves.toBe(false);
  });

  describe("re-sending", () => {
    it("has Postgres re-post the stored dispatch, so the token stays in the database", async () => {
      await dispatch("scoring");
      expect(await dispatch("scoring", { resend: true })).toBe(true);
      expect(resend).toHaveBeenCalledWith({ p_organization_id: ORG, p_job_id: JOB_ID, p_step: "scoring" }, expect.anything());
      expect(fake.tables.job_dispatches).toHaveLength(1);
      expect(fake.tables.job_dispatches[0].attempts).toBe(2);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does nothing more when the job no longer waits for the step", async () => {
      resend.mockReturnValueOnce("not_pending");
      expect(await dispatch("scoring", { resend: true })).toBe(true);
      expect(fake.tables.job_dispatches).toHaveLength(0);
    });

    it("records the hand-off afresh when none is stored (a job handed off before database mode)", async () => {
      expect(await dispatch("planning", { resend: true })).toBe(true);
      expect(resend).toHaveBeenCalledTimes(1);
      expect(fake.tables.job_dispatches).toEqual([expect.objectContaining({ job_id: JOB_ID, step: "planning" })]);
    });

    it("reports a hand-off that failed for good, without posting or recording it again, so the caller fails the job", async () => {
      // e.g. the deployment answered 401: it signs with another key than the one that recorded the token.
      await dispatch("scoring");
      fake.tables.job_dispatches[0].refused = true;
      expect(await dispatch("scoring", { resend: true })).toBe(false);
      expect(fake.tables.job_dispatches).toHaveLength(1);
      expect(fake.tables.job_dispatches[0].attempts).toBe(1);
      expect(logged()).toContain("refused or failed 4 times");
      expect(logged()).not.toContain(signContinue(continueKey(), JOB_ID, "scoring"));
    });

    it("records the hand-off when the re-send answers something unexpected", async () => {
      resend.mockReturnValueOnce(null);
      expect(await dispatch("planning", { resend: true })).toBe(true);
      expect(fake.tables.job_dispatches).toEqual([expect.objectContaining({ job_id: JOB_ID, step: "planning" })]);
    });

    it("falls back to recording when the re-send call fails, and fails only when that fails too", async () => {
      const broken = fakeSupabase({ job_dispatches: [] }, {}, { unique: { job_dispatches: [["job_id", "step"]] } });
      // No resend_job_dispatch function: the call errors, and the hand-off is recorded instead.
      expect(await dispatch("planning", { resend: true, db: broken.db })).toBe(true);
      expect(broken.tables.job_dispatches).toHaveLength(1);
      // Already recorded: the sweeper keeps re-posting it.
      expect(await dispatch("planning", { resend: true, db: broken.db })).toBe(true);
      // Nothing works (the migration isn't applied): the caller fails the job.
      broken.failWrites(1, undefined, { code: "PGRST205", message: "Could not find the table 'public.job_dispatches'" });
      expect(await dispatch("writing", { resend: true, db: broken.db })).toBe(false);
    });
  });
});

describe("retryable", () => {
  it("retries only what may pass on another attempt", () => {
    expect([408, 429, 500, 502, 503, 504, 508].every(retryable)).toBe(true);
    expect([301, 307, 400, 401, 403, 404, 413].some(retryable)).toBe(false);
  });
});

describe("retryableDbError", () => {
  it("retries dropped connections and transient server states, not refusals", () => {
    expect([undefined, "", "08006", "40001", "53300", "57014", "PGRST000", "PGRST003"].every((code) => retryableDbError({ code: code as string }))).toBe(true);
    expect(["23505", "23503", "23514", "42501", "42P01", "PGRST205", "PGRST202", "22P02"].some((code) => retryableDbError({ code }))).toBe(false);
  });
});
