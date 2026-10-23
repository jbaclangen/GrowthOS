import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import fixture from "./__fixtures__/search-console.json";
import { decryptWithKey, encryptWithKey } from "./secret-box";
import {
  GoogleOAuthError,
  OAUTH_SCOPES,
  SEARCH_CONSOLE_SCOPE,
  buildAuthUrl,
  emailFromIdToken,
  openState,
  pkceChallenge,
  randomToken,
  redirectUriFor,
  sealState,
  stateMatches,
} from "./google-oauth";
import { SEARCH_CONSOLE_PAUSED_MESSAGE, searchConsoleAccess } from "./search-console-access";
import {

  SearchConsoleApiError,
  dateRanges,
  describeError,
  homeUrlFor,
  matchProperties,
  normalizeInspection,
  normalizeRows,
  normalizeSitemaps,
  normalizeTotals,
  percentChange,
  pickProperty,
  summarizeSnapshot,
  verifiedProperties,
  type Snapshot,
} from "./search-console";

beforeAll(() => {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("secret box (AES-256-GCM)", () => {
  const key = randomBytes(32);

  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptWithKey("1//refresh-token", key);
    const b = encryptWithKey("1//refresh-token", key);
    expect(a).toMatch(/^v1:[\w-]+:[\w-]+:[\w-]+$/);
    expect(a).not.toBe(b);
    expect(decryptWithKey(a, key)).toBe("1//refresh-token");
  });

  it("rejects tampering, a wrong key and unknown formats", () => {
    const sealed = encryptWithKey("secret", key);
    const [v, iv, tag, ct] = sealed.split(":");
    const flipped = Buffer.from(ct, "base64url");
    flipped[0] ^= 1;
    expect(() => decryptWithKey([v, iv, tag, flipped.toString("base64url")].join(":"), key)).toThrow();
    const badTag = Buffer.from(tag, "base64url");
    badTag[0] ^= 1;
    expect(() => decryptWithKey([v, iv, badTag.toString("base64url"), ct].join(":"), key)).toThrow();
    expect(() => decryptWithKey(sealed, randomBytes(32))).toThrow();
    expect(() => decryptWithKey(`v2:${iv}:${tag}:${ct}`, key)).toThrow();
    expect(() => decryptWithKey("garbage", key)).toThrow();
    expect(() => encryptWithKey("x", randomBytes(16))).toThrow();
  });
});

describe("OAuth helpers", () => {
  it("derives the PKCE S256 challenge (RFC 7636 appendix B vector)", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(randomToken()).toMatch(/^[\w-]{43}$/);
  });

  it("builds a least-privilege, offline, consent auth URL", () => {
    const url = new URL(buildAuthUrl({ clientId: "cid", redirectUri: "http://localhost:3000/api/integrations/google/callback", state: "st", codeChallenge: "ch" }));
    const p = url.searchParams;
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(p.get("scope")).toBe(OAUTH_SCOPES.join(" "));
    expect(p.get("scope")?.split(" ")).toEqual(["openid", "email", SEARCH_CONSOLE_SCOPE]);
    expect(p.get("access_type")).toBe("offline");
    expect(p.get("prompt")).toBe("consent");
    expect(p.get("include_granted_scopes")).toBe("false");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("response_type")).toBe("code");
  });

  it("only allows registered redirect origins", () => {
    expect(redirectUriFor("https://app.braventa.io")).toBe("https://app.braventa.io/api/integrations/google/callback");
    expect(redirectUriFor("http://localhost:3000")).toBe("http://localhost:3000/api/integrations/google/callback");
    expect(redirectUriFor("https://evil.example")).toBeNull();
    expect(redirectUriFor("http://app.braventa.io")).toBeNull();
    expect(redirectUriFor("http://localhost:3005")).toBeNull();
    expect(redirectUriFor("http://localhost:3005", ["http://localhost:3005/"])).toBe("http://localhost:3005/api/integrations/google/callback");
    expect(redirectUriFor("not a url")).toBeNull();
  });

  it("seals state, binds it to user and organization, and expires it", () => {
    const s = { state: "abc", verifier: "v", userId: "u1", orgId: "o1", redirectUri: "r", expiresAt: Date.now() + 60_000 };
    const sealed = sealState(s);
    expect(sealed).not.toContain("abc");
    const opened = openState(sealed);
    expect(opened).toEqual(s);
    expect(stateMatches(opened, "abc", "u1", "o1")).toBe(true);
    expect(stateMatches(opened, "abd", "u1", "o1")).toBe(false);
    expect(stateMatches(opened, "abc", "u2", "o1")).toBe(false);
    expect(stateMatches(opened, "abc", "u1", "o2")).toBe(false);
    expect(stateMatches(opened, null, "u1", "o1")).toBe(false);
    expect(stateMatches(null, "abc", "u1", "o1")).toBe(false);
    expect(openState(sealState({ ...s, expiresAt: Date.now() - 1 }))).toBeNull();
    expect(openState(`${sealed}x`)).toBeNull();
    expect(openState(undefined)).toBeNull();
  });

  it("keeps the page to return to in the sealed state, and still opens a state without one", () => {
    const s = { state: "abc", verifier: "v", userId: "u1", orgId: "o1", redirectUri: "r", expiresAt: Date.now() + 60_000 };
    const returnTo = "/onboarding/0b5e3c1a-7f2d-4e8b-9a6c-1d2e3f4a5b6c/connect";
    const sealed = sealState({ ...s, returnTo });
    expect(sealed).not.toContain("onboarding");
    expect(openState(sealed)?.returnTo).toBe(returnTo);
    expect(openState(sealState(s))).toEqual(s);
    expect(openState(sealState(s))?.returnTo).toBeUndefined();
  });

  it("reads the email from an id_token payload", () => {
    const payload = Buffer.from(JSON.stringify({ email: "owner@example.com", sub: "1" })).toString("base64url");
    expect(emailFromIdToken(`h.${payload}.sig`)).toBe("owner@example.com");
    expect(emailFromIdToken(undefined)).toBeNull();
    expect(emailFromIdToken("not-a-jwt")).toBeNull();
  });
});

describe("plan gate", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

  it("allows an active trial, Pro and Premium", () => {
    expect(searchConsoleAccess({ plan: "trial", trial_ends_at: days(3) }, now)).toEqual({ allowed: true });
    expect(searchConsoleAccess({ plan: "pro", trial_ends_at: days(-30) }, now)).toEqual({ allowed: true });
    expect(searchConsoleAccess({ plan: "premium", trial_ends_at: days(-30) }, now)).toEqual({ allowed: true });
  });

  it("pauses on Basic and after the trial", () => {
    expect(searchConsoleAccess({ plan: "basic", trial_ends_at: days(5) }, now)).toEqual({ allowed: false, reason: SEARCH_CONSOLE_PAUSED_MESSAGE });
    expect(searchConsoleAccess({ plan: "trial", trial_ends_at: days(-0.01) }, now).allowed).toBe(false);
    expect(searchConsoleAccess({ plan: "unknown", trial_ends_at: days(5) }, now).allowed).toBe(false);
  });
});

describe("property matching", () => {
  const props = verifiedProperties(fixture.sites);

  it("keeps verified properties only", () => {
    expect(props).toEqual(["https://other.org/", "https://www.example.com/", "sc-domain:example.com"]);
  });

  it("prefers the domain property, then the exact URL prefix", () => {
    expect(matchProperties("https://www.example.com", props)).toEqual(["sc-domain:example.com", "https://www.example.com/"]);
    expect(pickProperty("https://www.example.com/about", props)).toBe("sc-domain:example.com");
    expect(pickProperty("example.com", ["https://www.example.com/"])).toBe("https://www.example.com/");
    expect(pickProperty("https://shop.example.com", ["sc-domain:example.com", "https://other.org/"])).toBe("sc-domain:example.com");
  });

  it("asks the owner when matches tie or nothing matches", () => {
    expect(pickProperty("http://example.com", ["https://example.com/", "https://www.example.com/"])).toBeNull();
    expect(pickProperty("https://nomatch.io", props)).toBeNull();
    expect(pickProperty("not a url at all", props)).toBeNull();
    expect(matchProperties("https://example.com", ["https://example.com.evil.io/", "sc-domain:ample.com"])).toEqual([]);
  });

  it("inspects the home page inside the property", () => {
    expect(homeUrlFor("https://www.example.com/", "https://www.example.com/x")).toBe("https://www.example.com/");
    expect(homeUrlFor("sc-domain:example.com", "https://www.example.com/x")).toBe("https://www.example.com/");
    expect(homeUrlFor("sc-domain:example.com", "")).toBe("https://example.com/");
  });
});

describe("response normalization", () => {
  it("normalizes totals, rows, sitemaps and inspection", () => {
    expect(normalizeTotals(fixture.totals)).toEqual({ clicks: 120, impressions: 4800, ctr: 0.025, position: 14.3 });
    expect(normalizeTotals(fixture.empty)).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
    const rows = normalizeRows(fixture.queries);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ key: "plumber near me", clicks: 40, impressions: 900, ctr: 0.0444, position: 6.3 });
    expect(normalizeRows(fixture.empty)).toEqual([]);
    expect(normalizeRows(null)).toEqual([]);
    expect(normalizeSitemaps(fixture.sitemaps)).toEqual([
      {
        path: "https://www.example.com/sitemap.xml",
        lastSubmitted: "2026-09-01T10:00:00.000Z",
        lastDownloaded: "2026-10-09T03:12:00.000Z",
        isPending: false,
        errors: 0,
        warnings: 1,
        submitted: 50,
      },
    ]);
    expect(normalizeInspection(fixture.inspection, "https://www.example.com/")).toMatchObject({
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      googleCanonical: "https://www.example.com/",
    });
    expect(normalizeInspection({}, "https://www.example.com/")).toBeNull();
  });

  it("uses the last 28 days of final data and the 28 before", () => {
    const r = dateRanges(new Date("2026-10-11T15:00:00Z"));
    expect(r.current).toEqual({ start: "2026-09-11", end: "2026-10-08" });
    expect(r.previous).toEqual({ start: "2026-08-14", end: "2026-09-10" });
  });

  it("computes changes only when there is a baseline", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(5, 0)).toBeNull();
  });

  it("maps API errors to plain messages", () => {
    expect(describeError(new SearchConsoleApiError(401, "x")).status).toBe("error");
    expect(describeError(new SearchConsoleApiError(403, "x"), "sc-domain:example.com").message).toContain("sc-domain:example.com");
    expect(describeError(new SearchConsoleApiError(429, "x"))).toMatchObject({ status: "active" });
    expect(describeError(new GoogleOAuthError("x", "invalid_grant")).message).toContain("Reconnect");
    expect(describeError(new Error("boom")).status).toBe("active");
  });

  it("summarizes a snapshot for a prompt without secrets", () => {
    const snap: Snapshot = {
      property: "sc-domain:example.com",
      date_range_start: "2026-09-11",
      date_range_end: "2026-10-08",
      totals: { current: normalizeTotals(fixture.totals), previous: normalizeTotals(fixture.previousTotals), previousRange: { start: "2026-08-14", end: "2026-09-10" } },
      rows: {
        queries: normalizeRows(fixture.queries),
        pages: [],
        devices: [],
        sitemaps: normalizeSitemaps(fixture.sitemaps),
        inspection: normalizeInspection(fixture.inspection, "https://www.example.com/"),
        notes: [],
      },
      fetched_at: "2026-10-11T15:00:00Z",
    };
    const s = summarizeSnapshot(snap);
    expect(s.totals).toMatchObject({ clicks: 120, impressions: 4800, ctr_percent: 2.5, clicks_change_percent: 20, impressions_change_percent: -4 });
    expect(s.top_queries[0]).toEqual({ key: "plumber near me", clicks: 40, impressions: 900, ctr: 4.4, position: 6.3 });
    expect(s.home_page_index).toEqual({ verdict: "PASS", coverage: "Submitted and indexed" });
    expect(s.little_data).toBe(false);
    expect(JSON.stringify(s)).not.toMatch(/token|@/i);
  });
});
