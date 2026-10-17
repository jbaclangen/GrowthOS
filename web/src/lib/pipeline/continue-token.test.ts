import { describe, expect, it } from "vitest";
import { deriveContinueKey, signContinue, verifyContinue } from "./continue-token";

const JOB = "6f1c2a7e-1d1b-4c55-9a52-3f3d1b2c4e5f";
const key = deriveContinueKey(undefined, "sb_secret_example");

describe("continue token", () => {
  it("accepts the token for the same job and step", () => {
    expect(verifyContinue(key, JOB, "profiling", signContinue(key, JOB, "profiling"))).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = signContinue(key, JOB, "profiling");
    const flipped = (token[0] === "A" ? "B" : "A") + token.slice(1);
    expect(verifyContinue(key, JOB, "profiling", flipped)).toBe(false);
    expect(verifyContinue(key, JOB, "profiling", token.slice(1))).toBe(false);
    expect(verifyContinue(key, JOB, "profiling", "")).toBe(false);
    expect(verifyContinue(key, JOB, "profiling", undefined)).toBe(false);
  });

  it("rejects a token for another step or job", () => {
    const token = signContinue(key, JOB, "profiling");
    expect(verifyContinue(key, JOB, "scoring", token)).toBe(false);
    expect(verifyContinue(key, "0b8f7e3a-4b8c-4e0a-9d5f-1c2b3a4d5e6f", "profiling", token)).toBe(false);
  });

  it("rejects a token signed with another key", () => {
    const other = deriveContinueKey(undefined, "sb_secret_other");
    expect(verifyContinue(key, JOB, "profiling", signContinue(other, JOB, "profiling"))).toBe(false);
  });

  it("prefers JOB_CONTINUE_SECRET over the derived key", () => {
    const own = deriveContinueKey("x".repeat(32), "sb_secret_example");
    expect(own.equals(key)).toBe(false);
    expect(own.toString("utf8")).toBe("x".repeat(32));
    expect(key.length).toBe(32);
  });
});
