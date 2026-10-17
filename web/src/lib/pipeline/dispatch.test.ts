import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { continueUrl, dispatchStep, retryable } from "./dispatch";

const JOB = "6f1c2a7e-1d1b-4c55-9a52-3f3d1b2c4e5f";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");
  vi.stubEnv("JOB_CONTINUE_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const status = (code: number) => new Response(null, { status: code });

// Runs dispatchStep to completion, skipping the waits between attempts.
async function dispatch(step = "profiling", opts?: { origin?: string }) {
  const result = dispatchStep(JOB, step, opts);
  await vi.runAllTimersAsync();
  return result;
}

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

describe("dispatchStep", () => {
  it("returns true once the route accepts the step", async () => {
    fetchMock.mockResolvedValueOnce(status(202));
    expect(await dispatch()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://app.example.com/api/jobs/continue");
    expect(JSON.parse(init.body)).toMatchObject({ jobId: JOB, step: "profiling", token: expect.any(String) });
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

  it("gives up after three failed attempts", async () => {
    fetchMock.mockResolvedValue(status(502));
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
});

describe("retryable", () => {
  it("retries only what may pass on another attempt", () => {
    expect([408, 429, 500, 502, 503, 504].every(retryable)).toBe(true);
    expect([301, 307, 400, 401, 403, 404, 413].some(retryable)).toBe(false);
  });
});
