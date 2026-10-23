import { describe, expect, it } from "vitest";
import { FEATURES } from "@/lib/plans/tiers";
import {
  MODULES,
  MODULE_IDS,
  enabledModuleIds,
  getModule,
  isModuleId,
  liveModules,
  moduleFeature,
  moduleForArea,
  moduleForFinding,
  moduleLabel,
} from "./registry";

describe("the module registry", () => {
  it("has unique ids and descriptive names (D-010)", () => {
    expect(new Set(MODULE_IDS).size).toBe(MODULES.length);
    for (const m of MODULES) {
      // Sentence case: a capital first, then lowercase words or acronyms (SEO, CRM), never Title Case.
      expect(m.label).toMatch(/^[A-Z]\S*( ([a-z]\S*|[A-Z]{2,}))*$/);
      expect(m.label).not.toMatch(/AI|Braventa/);
    }
  });

  it("follows D-051's module-to-tier map", () => {
    const byTier = (tier: string) => MODULES.filter((m) => m.tier === tier).map((m) => m.id);
    expect(byTier("basic")).toEqual(["business_intel", "website_seo", "conversion", "content_studio"]);
    expect(byTier("pro")).toEqual(["search_visibility", "local_seo", "social", "search_ads", "email", "video", "crm", "analytics", "automation"]);
    expect(byTier("premium")).toEqual(["custom_integrations"]);
  });

  it("marks live only what the current pipeline does: the four Basic modules and Search visibility (D-051 step 6)", () => {
    expect(liveModules().map((m) => m.id)).toEqual(["business_intel", "website_seo", "conversion", "content_studio", "search_visibility"]);
    for (const m of liveModules()) expect(m.tier, m.id).toBe(m.id === "search_visibility" ? "pro" : "basic");
    expect(getModule("search_visibility")).toMatchObject({ live: true, tier: "pro", featureId: "search_console" });
    expect(getModule("local_seo").live).toBe(false);
  });

  it("agrees with the plans page: a module's feature has its tier, and a live module's feature is live", () => {
    for (const m of MODULES) {
      const feature = moduleFeature(m);
      if (!m.featureId) continue;
      expect(feature, m.id).toBeTruthy();
      expect(FEATURES.find((f) => f.id === m.featureId)).toBe(feature);
      expect(feature!.minTier, m.id).toBe(m.tier);
      if (m.live) expect(feature!.status, m.id).toBe("live");
    }
  });

  it("scores only live modules today, and names a sub-score for every weighted one", () => {
    for (const m of MODULES) {
      if (m.scoreWeight !== null) {
        expect(m.live, m.id).toBe(true);
        expect(m.subScore, m.id).toBeTruthy();
        expect(m.scoreWeight).toBeGreaterThan(0);
      }
    }
    // The Basic modules carry the whole score on Basic: PageSpeed about a third, the assessment about two-thirds
    // (D-035). Search visibility adds a modest 0.10 for an organization with Search Console evidence
    // (FEATURE_MODULES.md §9), about 9% of a full score once renormalized.
    const basic = MODULES.filter((m) => m.tier === "basic").reduce((s, m) => s + (m.scoreWeight ?? 0), 0);
    expect(basic).toBeCloseTo(1, 10);
    expect(getModule("website_seo").scoreWeight).toBeCloseTo(0.35, 10);
    expect(getModule("conversion").scoreWeight).toBeCloseTo(0.65, 10);
    expect(getModule("search_visibility").scoreWeight).toBeCloseTo(0.1, 10);
    const total = MODULES.reduce((s, m) => s + (m.scoreWeight ?? 0), 0);
    expect(total).toBeCloseTo(1.1, 10);
  });

  it("recognises ids and labels them", () => {
    expect(isModuleId("website_seo")).toBe(true);
    expect(isModuleId("seo")).toBe(false);
    expect(isModuleId(null)).toBe(false);
    expect(moduleLabel("website_seo")).toBe("Website and technical SEO");
  });
});

describe("enabledModuleIds", () => {
  it("gives every tier the four Basic modules, and Pro and Premium Search visibility as well", () => {
    const basic = enabledModuleIds("basic");
    expect([...basic]).toEqual(["business_intel", "website_seo", "conversion", "content_studio"]);
    expect([...enabledModuleIds("pro")]).toEqual([...basic, "search_visibility"]);
    expect(enabledModuleIds("premium")).toEqual(enabledModuleIds("pro"));
  });

  it("applies an organization's overrides, but can't switch on what isn't live or included", () => {
    const enabled = enabledModuleIds("basic", [
      { module_id: "website_seo", enabled: false },
      { module_id: "search_visibility", enabled: true },
      { module_id: "no_such_module", enabled: false },
    ]);
    expect([...enabled]).toEqual(["business_intel", "conversion", "content_studio"]);
    expect(enabledModuleIds("pro", [{ module_id: "local_seo", enabled: true }]).has("local_seo")).toBe(false);
    expect(enabledModuleIds("pro", [{ module_id: "search_visibility", enabled: false }]).has("search_visibility")).toBe(false);
  });
});

describe("moduleForArea", () => {
  it("maps the plan prompt's areas, taking the first of a comma-joined list", () => {
    expect(moduleForArea("website")).toBe("website_seo");
    expect(moduleForArea("seo")).toBe("website_seo");
    expect(moduleForArea("content")).toBe("content_studio");
    expect(moduleForArea("conversion")).toBe("conversion");
    expect(moduleForArea("social")).toBe("social");
    expect(moduleForArea("crm")).toBe("crm");
    expect(moduleForArea("ads")).toBe("search_ads");
    expect(moduleForArea("seo, content")).toBe("website_seo");
    expect(moduleForArea(" SEO ")).toBe("website_seo");
  });

  it("leaves operations, unknown and empty areas without a module", () => {
    expect(moduleForArea("operations")).toBeNull();
    expect(moduleForArea("branding")).toBeNull();
    expect(moduleForArea("")).toBeNull();
    expect(moduleForArea(", seo")).toBeNull();
  });

  it("covers every area the registry claims", () => {
    for (const m of MODULES) for (const area of m.planAreas) expect(moduleForArea(area)).toBe(m.id);
  });
});

describe("moduleForFinding", () => {
  it("attributes findings by where their evidence comes from", () => {
    expect(moduleForFinding({ provenance: "verified" })).toBe("website_seo");
    expect(moduleForFinding({ provenance: "verified", audit_refs: ["T1", "P1"] })).toBe("website_seo");
    expect(moduleForFinding({ provenance: "customer_provided" })).toBe("business_intel");
    expect(moduleForFinding({ provenance: "inferred" })).toBeNull();
  });

  it("gives a verified finding that cites the Search Console summary to Search visibility", () => {
    expect(moduleForFinding({ provenance: "verified", audit_refs: ["G1"] })).toBe("search_visibility");
    expect(moduleForFinding({ provenance: "verified", audit_refs: ["T3", "G1"] })).toBe("search_visibility");
    // An inferred finding is the model's reasoning even when it mentions the ref: the parser drops uncited refs.
    expect(moduleForFinding({ provenance: "inferred", audit_refs: ["G1"] })).toBeNull();
  });
});
