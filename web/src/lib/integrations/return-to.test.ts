import { describe, expect, it } from "vitest";
import { SETTINGS_RETURN, connectionOutcomeUrl, connectionReturnPath, searchConsoleStartHref } from "./return-to";

const ID = "0b5e3c1a-7f2d-4e8b-9a6c-1d2e3f4a5b6c";
const CONNECT = `/onboarding/${ID}/connect`;

describe("connectionReturnPath", () => {
  it("accepts an onboarding connect step with a lowercase UUID, unchanged", () => {
    expect(connectionReturnPath(CONNECT)).toBe(CONNECT);
  });

  it("falls back to Settings for everything else", () => {
    for (const raw of [
      undefined,
      null,
      42,
      {},
      "",
      "/settings",
      "/dashboard",
      "//evil.com",
      "/\\evil.com",
      `https://evil.com${CONNECT}`,
      `${CONNECT}?x=1`,
      `${CONNECT}#a`,
      `${CONNECT}/`,
      `/onboarding/${ID}/../../x/connect`,
      "/onboarding/not-a-uuid/connect",
      `/onboarding/${ID.toUpperCase()}/connect`,
      `${CONNECT}\n`,
      `/onboarding/${ID}%2Fconnect`,
      `%2Fonboarding%2F${ID}%2Fconnect`,
      ` ${CONNECT}`,
      `${CONNECT}/extra`,
      `/onboarding/${ID}/review`,
      `/onboarding/${ID}/questions`,
    ]) {
      expect(connectionReturnPath(raw), String(raw)).toBe(SETTINGS_RETURN);
    }
  });
});

describe("connectionOutcomeUrl", () => {
  it("returns to Settings → Connections", () => {
    expect(connectionOutcomeUrl("/settings", "connected")).toBe("/settings?gsc=connected#connections");
    expect(connectionOutcomeUrl(undefined, "expired")).toBe("/settings?gsc=expired#connections");
  });

  it("returns to the Search Console card on the onboarding step", () => {
    expect(connectionOutcomeUrl(CONNECT, "denied")).toBe(`${CONNECT}?gsc=denied#search-console`);
  });

  it("encodes the code", () => {
    expect(connectionOutcomeUrl("/settings", "a b&c=d#e")).toBe("/settings?gsc=a%20b%26c%3Dd%23e#connections");
  });

  it("never leaves the app, whatever the saved state says", () => {
    expect(connectionOutcomeUrl("https://evil.com", "connected")).toBe("/settings?gsc=connected#connections");
    expect(connectionOutcomeUrl("//evil.com", "connected")).toBe("/settings?gsc=connected#connections");
    expect(connectionOutcomeUrl(`https://evil.com${CONNECT}`, "connected")).toBe("/settings?gsc=connected#connections");
  });
});

describe("searchConsoleStartHref", () => {
  it("adds returnTo only for the onboarding step", () => {
    expect(searchConsoleStartHref("/settings")).toBe("/api/integrations/google/start");
    expect(searchConsoleStartHref(CONNECT)).toBe(`/api/integrations/google/start?returnTo=${encodeURIComponent(CONNECT)}`);
  });

  it("uses the plain start route for a path that isn't allowed", () => {
    expect(searchConsoleStartHref("/dashboard")).toBe("/api/integrations/google/start");
    expect(searchConsoleStartHref("https://evil.com")).toBe("/api/integrations/google/start");
  });

  it("round-trips through the start route's check", () => {
    const href = new URL(searchConsoleStartHref(CONNECT), "https://app.braventa.io");
    expect(connectionReturnPath(href.searchParams.get("returnTo"))).toBe(CONNECT);
  });
});
