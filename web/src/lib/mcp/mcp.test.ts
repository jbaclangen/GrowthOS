import { describe, expect, it } from "vitest";
import { displayPrefix, generateKey, hashKey, keyFromAuthHeader } from "./keys";
import { mcpAccess } from "./access";

describe("access keys", () => {
  it("generates distinct keys in the expected format", () => {
    const a = generateKey();
    const b = generateKey();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^brv_[A-Za-z0-9_-]{43}$/);
    expect(displayPrefix(a)).toHaveLength(10);
  });

  it("hashes to 64 hex characters, deterministically", () => {
    const key = generateKey();
    expect(hashKey(key)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKey(key)).toBe(hashKey(key));
  });

  it("reads only well-formed bearer keys", () => {
    const key = generateKey();
    expect(keyFromAuthHeader(`Bearer ${key}`)).toBe(key);
    expect(keyFromAuthHeader(`bearer ${key}`)).toBe(key);
    expect(keyFromAuthHeader(null)).toBeNull();
    expect(keyFromAuthHeader(key)).toBeNull();
    expect(keyFromAuthHeader("Bearer brv_short")).toBeNull();
    expect(keyFromAuthHeader(`Bearer ${key} extra`)).toBeNull();
  });
});

describe("who may use the connection", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  it("allows an active trial", () => {
    expect(mcpAccess({ plan: "trial", trial_ends_at: "2026-10-20T00:00:00Z" }, now).allowed).toBe(true);
  });
  it("pauses when the trial has ended", () => {
    const result = mcpAccess({ plan: "trial", trial_ends_at: "2026-10-01T00:00:00Z" }, now);
    expect(result.allowed).toBe(false);
  });
  it("allows every paid plan, whatever the old trial date", () => {
    for (const plan of ["basic", "pro", "premium"]) {
      expect(mcpAccess({ plan, trial_ends_at: "2026-01-01T00:00:00Z" }, now).allowed).toBe(true);
    }
  });
  it("refuses unknown plans", () => {
    expect(mcpAccess({ plan: "free", trial_ends_at: "2026-12-01T00:00:00Z" }, now).allowed).toBe(false);
  });
});
