import { describe, expect, it } from "vitest";
import { searchConsoleAccess } from "./search-console-access";
import { NON_OWNER_LINE, OTHER_BUSINESS_LINE, canConnectSearchConsole, connectPlanLine, searchConsoleCardState } from "./connect-step";

const now = new Date("2026-10-18T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();
const trial = (n: number) => ({ plan: "trial", trial_ends_at: days(n) });
const allowed = (org: { plan: string; trial_ends_at: string }) => searchConsoleAccess(org, now).allowed;

const base = { configured: true, hasBusiness: true, canConnectHere: true, isOwner: true, allowed: true, connection: null };
const active = { status: "active" };

describe("searchConsoleCardState", () => {
  it("shows not configured before anything else", () => {
    expect(searchConsoleCardState({ ...base, configured: false, connection: active })).toBe("not-configured");
    expect(searchConsoleCardState({ ...base, configured: false, canConnectHere: false, hasBusiness: false })).toBe("not-configured");
  });

  it("shows nothing of the user's own business on another business's session", () => {
    expect(searchConsoleCardState({ ...base, canConnectHere: false, connection: active })).toBe("other-business");
    expect(searchConsoleCardState({ ...base, canConnectHere: false, hasBusiness: false })).toBe("other-business");
  });

  it("asks to analyze a website first when there is no business", () => {
    expect(searchConsoleCardState({ ...base, hasBusiness: false })).toBe("no-business");
  });

  it("lets a Pro or trial owner connect, and asks members to ask the owner", () => {
    for (const org of [trial(5), { plan: "pro", trial_ends_at: days(-30) }, { plan: "premium", trial_ends_at: days(-30) }]) {
      expect(searchConsoleCardState({ ...base, allowed: allowed(org) }), org.plan).toBe("connectable");
      expect(searchConsoleCardState({ ...base, allowed: allowed(org), isOwner: false }), org.plan).toBe("owner-only");
    }
  });

  it("pauses on Basic, including an ended trial", () => {
    for (const org of [{ plan: "basic", trial_ends_at: days(5) }, trial(-1)]) {
      expect(searchConsoleCardState({ ...base, allowed: allowed(org) }), org.plan).toBe("paused-not-connected");
      expect(searchConsoleCardState({ ...base, allowed: allowed(org), isOwner: false }), org.plan).toBe("paused-not-connected");
      expect(searchConsoleCardState({ ...base, allowed: allowed(org), connection: active }), org.plan).toBe("paused-connected");
    }
  });

  it("shows a live connection, and treats a revoked one as none", () => {
    expect(searchConsoleCardState({ ...base, connection: active })).toBe("connected");
    expect(searchConsoleCardState({ ...base, connection: { status: "error" } })).toBe("connected");
    expect(searchConsoleCardState({ ...base, isOwner: false, connection: active })).toBe("connected");
    expect(searchConsoleCardState({ ...base, connection: { status: "revoked" } })).toBe("connectable");
    expect(searchConsoleCardState({ ...base, allowed: false, connection: { status: "revoked" } })).toBe("paused-not-connected");
  });
});

describe("connectPlanLine", () => {
  const owner = { configured: true, canConnectHere: true, isOwner: true, now };

  it("tells a trial owner how long connecting is included, and what happens on Basic", () => {
    expect(connectPlanLine({ ...owner, org: trial(5) })).toBe(
      "Connecting tools is part of Pro, and your free trial includes it for 5 more days. After the trial, on Basic, connections pause: data already fetched is kept, but nothing new is fetched.",
    );
    expect(connectPlanLine({ ...owner, org: trial(0.5) })).toMatch(/for 1 more day\. /);
  });

  it("says nothing extra on paid Pro or Premium, or on Basic (the card says it's paused)", () => {
    for (const plan of ["pro", "premium", "basic"]) expect(connectPlanLine({ ...owner, org: { plan, trial_ends_at: days(-30) } })).toBeNull();
    expect(connectPlanLine({ ...owner, org: trial(-1) })).toBeNull();
    expect(connectPlanLine({ ...owner, org: null })).toBeNull();
  });

  it("tells a member that only the owner can connect", () => {
    expect(connectPlanLine({ ...owner, isOwner: false, org: trial(5) })).toBe(NON_OWNER_LINE);
  });

  it("explains another business's session first", () => {
    expect(connectPlanLine({ configured: true, canConnectHere: false, isOwner: false, org: trial(5), now })).toBe(OTHER_BUSINESS_LINE);
    expect(OTHER_BUSINESS_LINE).not.toMatch(/owner's account/);
  });

  it("says nothing about connecting when the connection isn't set up for this deployment", () => {
    expect(connectPlanLine({ ...owner, configured: false, org: trial(5) })).toBeNull();
    expect(connectPlanLine({ ...owner, configured: false, isOwner: false, org: trial(5) })).toBeNull();
    expect(connectPlanLine({ configured: false, canConnectHere: false, isOwner: false, org: trial(5), now })).toBeNull();
  });
});

describe("canConnectSearchConsole", () => {
  const input = { configured: true, hasBusiness: true, canConnectHere: true, isOwner: true, allowed: true };

  it("is true only for a Pro or trial owner on a configured deployment", () => {
    expect(canConnectSearchConsole(input)).toBe(true);
    expect(canConnectSearchConsole({ ...input, allowed: allowed(trial(5)) })).toBe(true);
  });

  it("is false on Basic, for a member, on another business's session, or when not set up", () => {
    expect(canConnectSearchConsole({ ...input, allowed: allowed({ plan: "basic", trial_ends_at: days(-30) }) })).toBe(false);
    expect(canConnectSearchConsole({ ...input, allowed: allowed(trial(-1)) })).toBe(false);
    expect(canConnectSearchConsole({ ...input, isOwner: false })).toBe(false);
    expect(canConnectSearchConsole({ ...input, canConnectHere: false, isOwner: false })).toBe(false);
    expect(canConnectSearchConsole({ ...input, configured: false })).toBe(false);
    expect(canConnectSearchConsole({ ...input, hasBusiness: false })).toBe(false);
  });
});
