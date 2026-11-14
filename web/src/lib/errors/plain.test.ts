import { describe, expect, it } from "vitest";
import { authErrorMessage, jobFailureMessage } from "./plain";

describe("jobFailureMessage", () => {
  const what = (raw: string | null) => jobFailureMessage(raw).what;

  it("maps each kind of stored job error to plain words", () => {
    expect(what("Monthly AI budget reached for this organization")).toMatch(/AI allowance/);
    expect(what("10.0.0.1 is a private or reserved network address")).toMatch(/can't analyze this web address/);
    expect(what("https://example.com/ returned 503")).toMatch(/couldn't open your website/);
    expect(what("fetch failed")).toMatch(/couldn't open your website/);
    expect(what("getaddrinfo ENOTFOUND example.invalid")).toMatch(/couldn't open your website/);
    expect(what("https://a.test redirected more than 5 times")).toMatch(/couldn't open your website/);
    expect(what("No enabled module has evidence for the growth score.")).toMatch(/enough information/);
    expect(what("The website analysis is missing. Re-run the analysis.")).toMatch(/missing/);
    expect(what("The analysis couldn't continue. Run it again.")).toMatch(/stopped partway/);
    expect(what("OpenRouter error 401: No auth credentials found")).toMatch(/AI service/);
    expect(what("OpenRouter: provider error")).toMatch(/AI service/);
    expect(what("planner returned unusable JSON: output was cut off at the token limit")).toMatch(/AI service/);
    expect(what('saving the plan failed: duplicate key value violates unique constraint "x"')).toMatch(/couldn't save/);
    expect(what("calendar insert failed: permission denied")).toMatch(/couldn't save/);
  });

  it("falls back for unknown or missing errors, and never repeats the raw text", () => {
    const raw = "TypeError: Cannot read properties of undefined (reading 'x')";
    expect(jobFailureMessage(raw)).toEqual(jobFailureMessage(null));
    for (const r of [raw, "OpenRouter error 401: secret detail", "saving the plan failed: relation \"x\""]) {
      const { what: w, next } = jobFailureMessage(r);
      expect(`${w} ${next}`).not.toContain(r);
      expect(`${w} ${next}`).not.toMatch(/OpenRouter|relation|TypeError/);
    }
  });

  it("always says what to do next", () => {
    for (const r of [null, "fetch failed", "Monthly AI budget reached for this organization", "x"]) {
      expect(jobFailureMessage(r).next.length).toBeGreaterThan(10);
    }
  });
});

describe("authErrorMessage", () => {
  it("maps known Supabase Auth codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials" }, "sign-in")).toBe("That email and password don't match. Try again.");
    expect(authErrorMessage({ code: "weak_password" }, "sign-up")).toMatch(/longer password/);
    expect(authErrorMessage({ code: "over_request_rate_limit" }, "sign-in")).toMatch(/Wait a few minutes/);
  });

  it("uses a fallback for unknown codes instead of the provider's text", () => {
    expect(authErrorMessage({ code: "unexpected_failure" }, "sign-in")).toBe("Sign-in didn't work. Try again in a minute.");
    expect(authErrorMessage({ code: null }, "sign-up")).toBe("Your account couldn't be created. Try again in a minute.");
  });
});
