import { describe, expect, it } from "vitest";
import { FEATURES } from "@/lib/plans/tiers";
import { getPainPoint, isActivePainPointId } from "@/lib/onboarding/catalog";
import { MAX_REASONS, TOOLS, suggestTools } from "./tool-catalog";

const ids = (s: ReturnType<typeof suggestTools>) => s.map((x) => x.tool.id);
const byId = (s: ReturnType<typeof suggestTools>, id: string) => s.find((x) => x.tool.id === id)!;
const pick = (id: string, priority: number | null = null, confirmed = true) => ({ id, priority, confirmed });

describe("tool catalog", () => {
  it("has exactly one live tool, Search Console, matching the tier list", () => {
    const live = TOOLS.filter((t) => t.status === "live");
    expect(live.map((t) => t.id)).toEqual(["search_console"]);
    expect(live[0].status).toBe(FEATURES.find((f) => f.id === "search_console")!.status);
  });

  it("uses unique ids and only active catalog pain points", () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    for (const t of TOOLS) for (const p of t.painPoints) expect(isActivePainPointId(p), `${t.id}: ${p}`).toBe(true);
  });

  it("labels every coming-soon line as planned, and only a live tool's line may say the diagnosis uses its data", () => {
    for (const t of TOOLS) {
      if (t.status === "coming_soon") {
        expect(t.helps, t.id).toMatch(/^Planned: /);
        expect(t.helps, t.id).not.toMatch(/diagnos/i);
      } else {
        expect(t.helps, t.id).not.toMatch(/^Planned/);
      }
    }
    // Search Console data feeds the diagnosis and the growth score (D-051 step 6).
    expect(TOOLS.find((t) => t.id === "search_console")?.helps).toMatch(/diagnosis and growth score/);
  });
});

describe("suggestTools", () => {
  it("puts a named tool first, with the owner's words and the pain point as reasons", () => {
    const s = suggestTools({ painPoints: [pick("leads.slow_follow_up", 1)], tools: ["HubSpot"] });
    expect(s[0].tool.id).toBe("hubspot");
    expect(s[0]).toMatchObject({
      suggested: true,
      reasons: ["You said you use HubSpot.", "You picked “Leads aren't contacted quickly or followed up consistently”."],
    });
  });

  it("suggests Search Console and Google Business Profile for being hard to find on Google", () => {
    const s = suggestTools({ painPoints: [pick("website.search_visibility", 2)], tools: [] });
    const reason = `You picked “${getPainPoint("website.search_visibility")!.label}”.`;
    expect(reason).toBe("You picked “We're hard to find on Google”.");
    for (const id of ["search_console", "google_business_profile"]) {
      expect(byId(s, id)).toMatchObject({ suggested: true, reasons: [reason] });
    }
    expect(ids(s).slice(0, 2)).toEqual(["search_console", "google_business_profile"]);
  });

  it("matches whole words only, case-insensitively, and quotes the entry as typed", () => {
    expect(byId(suggestTools({ painPoints: [], tools: ["Canvas prints"] }), "canva").suggested).toBe(false);
    expect(byId(suggestTools({ painPoints: [], tools: ["  GA4 "] }), "google_analytics")).toMatchObject({
      suggested: true,
      reasons: ["You said you use GA4."],
    });
    expect(byId(suggestTools({ painPoints: [], tools: ["canva pro"] }), "canva").reasons).toEqual(["You said you use canva pro."]);
    expect(byId(suggestTools({ painPoints: [], tools: ["Google Search Console"] }), "search_console").suggested).toBe(true);
  });

  it("suggests nothing without input and keeps catalog order", () => {
    const s = suggestTools({ painPoints: [], tools: [] });
    expect(ids(s)).toEqual(TOOLS.map((t) => t.id));
    expect(s.every((x) => !x.suggested && x.reasons.length === 0)).toBe(true);
  });

  it("caps reasons, tool mentions first, then pain points by priority", () => {
    const s = suggestTools({
      painPoints: [pick("crm.underused"), pick("crm.messy_data", 3), pick("leads.slow_follow_up", 1)],
      tools: ["HubSpot"],
    });
    const hubspot = byId(s, "hubspot");
    expect(hubspot.reasons).toHaveLength(MAX_REASONS);
    expect(hubspot.reasons[0]).toBe("You said you use HubSpot.");
    expect(hubspot.reasons[1]).toContain(getPainPoint("leads.slow_follow_up")!.label);

    const noTools = byId(suggestTools({ painPoints: [pick("crm.underused"), pick("crm.messy_data", 3)], tools: [] }), "hubspot");
    expect(noTools.reasons).toEqual([
      `You picked “${getPainPoint("crm.messy_data")!.label}”.`,
      `You picked “${getPainPoint("crm.underused")!.label}”.`,
    ]);
  });

  it("ignores unconfirmed and unknown pain points", () => {
    const s = suggestTools({ painPoints: [pick("leads.slow_follow_up", 1, false), pick("made.up", 1)], tools: [] });
    expect(s.every((x) => !x.suggested)).toBe(true);
  });

  it("orders a named tool before priority 1, priority 1 before 3, and ties in catalog order", () => {
    const s = suggestTools({
      painPoints: [pick("content.too_slow", 3), pick("leads.slow_follow_up", 1)],
      tools: ["LinkedIn"],
    });
    expect(ids(s).slice(0, 3)).toEqual(["linkedin", "hubspot", "canva"]);

    // content.inconsistent suggests Facebook and Instagram and LinkedIn at the same rank: catalog order.
    const tie = suggestTools({ painPoints: [pick("content.inconsistent", 2)], tools: [] });
    expect(ids(tie).slice(0, 2)).toEqual(["facebook_instagram", "linkedin"]);

    // Confirmed but unprioritized comes after every priority.
    const unranked = suggestTools({ painPoints: [pick("content.too_slow"), pick("crm.underused", 3)], tools: [] });
    expect(ids(unranked).slice(0, 2)).toEqual(["hubspot", "canva"]);
  });

  it("lists every tool exactly once", () => {
    const s = suggestTools({ painPoints: [pick("leads.too_few", 1)], tools: ["Facebook", "Instagram", "HubSpot"] });
    expect([...ids(s)].sort()).toEqual(TOOLS.map((t) => t.id).sort());
    expect(byId(s, "facebook_instagram").reasons).toEqual(["You said you use Facebook.", "You said you use Instagram."]);
  });
});
