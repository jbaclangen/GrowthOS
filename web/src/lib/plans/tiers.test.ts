import { describe, expect, it } from "vitest";
import { FEATURES, canUse, effectiveAccess, includes, proHasLiveFeatures } from "./tiers";

const now = new Date("2026-10-11T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

describe("effectiveAccess", () => {
  it("gives Pro during the trial, with days left rounded up", () => {
    const a = effectiveAccess({ plan: "trial", trial_ends_at: days(13.2) }, now);
    expect(a.tier).toBe("pro");
    expect(a.trial).toMatchObject({ active: true, daysLeft: 14 });
  });

  it("drops to Basic when the trial ends", () => {
    const a = effectiveAccess({ plan: "trial", trial_ends_at: days(-0.01) }, now);
    expect(a.tier).toBe("basic");
    expect(a.trial).toMatchObject({ active: false, daysLeft: 0 });
  });

  it("uses a paid or granted plan as stored, ignoring the trial date", () => {
    expect(effectiveAccess({ plan: "pro", trial_ends_at: days(-30) }, now)).toMatchObject({ tier: "pro", trial: null });
    expect(effectiveAccess({ plan: "premium", trial_ends_at: days(-30) }, now).tier).toBe("premium");
    expect(effectiveAccess({ plan: "basic", trial_ends_at: days(5) }, now).tier).toBe("basic");
  });

  it("treats an unknown stored plan as Basic", () => {
    expect(effectiveAccess({ plan: "enterprise", trial_ends_at: days(5) }, now)).toMatchObject({ tier: "basic", trial: null });
  });
});

describe("features", () => {
  it("has unique IDs and higher tiers include lower ones", () => {
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
    const basicFeature = FEATURES.find((f) => f.minTier === "basic")!;
    const proFeature = FEATURES.find((f) => f.minTier === "pro")!;
    expect(includes("premium", basicFeature)).toBe(true);
    expect(includes("pro", proFeature)).toBe(true);
    expect(includes("basic", proFeature)).toBe(false);
  });

  it("never lets anyone use a feature that isn't live", () => {
    expect(canUse("premium", "ai_agents")).toBe(false);
    expect(canUse("basic", "diagnosis")).toBe(true);
    expect(canUse("pro", "full_audit")).toBe(false);
  });

  it("says the in-app assistant pauses after the trial, since canUse() isn't its gate (D-042)", () => {
    // An ended trial is effective Basic, which includes the feature, yet assistantAccess refuses it until the
    // business chooses a plan (lib/assistant/access.ts). The plans pages must say so, as for assistant_connection.
    const ended = effectiveAccess({ plan: "trial", trial_ends_at: days(-1) }, now);
    expect(ended.tier).toBe("basic");
    expect(canUse(ended.tier, "ai_assistant")).toBe(true);
    for (const id of ["ai_assistant", "assistant_connection"] as const) {
      expect(FEATURES.find((f) => f.id === id)?.detail).toContain("Paused after the trial until you choose a plan.");
    }
  });

  it("reports that Pro adds a live feature: the Search Console connection", () => {
    expect(proHasLiveFeatures()).toBe(true);
    expect(canUse("pro", "search_console")).toBe(true);
    expect(canUse("premium", "search_console")).toBe(true);
    expect(canUse("basic", "search_console")).toBe(false);
  });
});
