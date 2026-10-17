import { describe, expect, it } from "vitest";
import { CATALOG_VERSION, CATEGORIES, PAIN_POINTS, SOLUTIONS, catalogForPrompt } from "./catalog";
import { MAX_AI_MATCHES, parseDiscoveryForm, parseReviewForm, sanitizeMatches } from "./discovery";

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

describe("catalog", () => {
  it("has a version and unique, well-formed IDs", () => {
    expect(CATALOG_VERSION).toBeGreaterThan(0);
    const ids = PAIN_POINTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z_]+\.[a-z_]+$/);
  });

  it("covers every category and only references known solutions", () => {
    const categoryIds = new Set(CATEGORIES.map((c) => c.id));
    expect(CATEGORIES).toHaveLength(10);
    for (const c of categoryIds) expect(PAIN_POINTS.some((p) => p.categoryId === c)).toBe(true);
    for (const p of PAIN_POINTS) {
      expect(categoryIds.has(p.categoryId)).toBe(true);
      expect(p.solutionIds.length).toBeGreaterThan(0);
      for (const s of p.solutionIds) expect(s in SOLUTIONS).toBe(true);
    }
  });

  it("labels unbuilt capabilities as planned or manual, never available", () => {
    for (const id of ["crm_intelligence", "automation", "analytics"] as const) {
      expect(SOLUTIONS[id].availability).toBe("planned");
    }
    // The in-app assistant shipped (D-042).
    expect(SOLUTIONS.ai_assistant.availability).toBe("available");
  });

  it("lists every active pain point for the classifier prompt", () => {
    const lines = catalogForPrompt().split("\n");
    expect(lines).toHaveLength(PAIN_POINTS.filter((p) => p.status === "active").length);
    expect(lines[0]).toMatch(/^leads\.too_few: /);
  });
});

describe("parseDiscoveryForm", () => {
  it("keeps known pain points, drops unknown ones and duplicates", () => {
    const r = parseDiscoveryForm(form({ painPoints: ["leads.too_few", "leads.too_few", "made.up"], statement: "" }));
    expect(r).toEqual({ data: { painPointIds: ["leads.too_few"], statement: null } });
  });

  it("accepts free text alone", () => {
    const r = parseDiscoveryForm(form({ statement: "  Phones are quiet in winter  " }));
    expect(r).toEqual({ data: { painPointIds: [], statement: "Phones are quiet in winter" } });
  });

  it("asks for something when the form is empty, and caps the text length", () => {
    expect("error" in parseDiscoveryForm(form({}))).toBe(true);
    expect(parseDiscoveryForm(form({ statement: "x".repeat(1001) }))).toEqual({
      error: "Keep your description under 1000 characters",
    });
  });
});

describe("sanitizeMatches", () => {
  it("keeps only catalog IDs, once each, normalizing confidence", () => {
    const out = sanitizeMatches({
      matches: [
        { pain_point_id: "leads.too_few", confidence: "HIGH", quote: " phones are quiet " },
        { pain_point_id: "invented.thing", confidence: "high" },
        { pain_point_id: "leads.too_few", confidence: "low" },
        { pain_point_id: "content.inconsistent", confidence: "medium" },
      ],
    });
    expect(out).toEqual([
      { painPointId: "leads.too_few", confidence: "high", quote: "phones are quiet" },
      { painPointId: "content.inconsistent", confidence: "medium", quote: "" },
    ]);
  });

  it("caps the number of suggestions and tolerates an empty answer", () => {
    const many = PAIN_POINTS.slice(0, 9).map((p) => ({ pain_point_id: p.id, confidence: "high" }));
    expect(sanitizeMatches({ matches: many })).toHaveLength(MAX_AI_MATCHES);
    expect(sanitizeMatches({})).toEqual([]);
  });

  it("rejects malformed output so the caller can recover", () => {
    expect(() => sanitizeMatches({ matches: [{ pain_point_id: "leads.too_few", confidence: "certain" }] })).toThrow();
  });
});

describe("parseReviewForm", () => {
  const candidates = ["leads.too_few", "content.inconsistent", "website.low_conversion"];

  it("keeps confirmed candidates and ordered priorities", () => {
    const r = parseReviewForm(
      form({ confirm: ["content.inconsistent", "leads.too_few", "not.a.candidate"], priority1: "leads.too_few", priority2: "content.inconsistent" }),
      candidates,
    );
    expect(r).toEqual({ data: { confirmedIds: ["content.inconsistent", "leads.too_few"], priorities: ["leads.too_few", "content.inconsistent"] } });
  });

  it("rejects priorities that weren't kept, repeated priorities, and an empty selection", () => {
    expect(parseReviewForm(form({ confirm: ["leads.too_few"], priority1: "content.inconsistent" }), candidates)).toEqual({
      error: "Choose priorities from the issues you kept.",
    });
    expect(
      parseReviewForm(form({ confirm: candidates, priority1: "leads.too_few", priority2: "leads.too_few" }), candidates),
    ).toEqual({ error: "Choose a different issue for each priority." });
    expect("error" in parseReviewForm(form({}), candidates)).toBe(true);
    expect(parseReviewForm(form({ confirm: ["leads.too_few"] }), candidates)).toEqual({ error: "Choose your first priority." });
  });
});
