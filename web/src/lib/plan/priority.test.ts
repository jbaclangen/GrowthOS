import { describe, expect, it } from "vitest";
import {
  MAX_FINDINGS,
  MAX_PLAN_ITEMS,
  calculatedPriority,
  capability,
  finalPriorities,
  orderPlan,
  toFindings,
  toPlanItems,
  type DiscoveryFacts,
  type RawFinding,
  type RawItem,
} from "./priority";

const facts: DiscoveryFacts = {
  priorityOf: new Map<string, number | null>([
    ["leads.slow_follow_up", 1],
    ["website.search_visibility", 2],
    ["content.inconsistent", null],
  ]),
  urgencyOf: new Map([["website.search_visibility", "no_rush"]]),
};

const finding = (over: Partial<RawFinding> = {}): RawFinding => ({
  statement: "Quotes are not followed up",
  evidence: "The owner said so",
  source: "owner",
  confidence: "high",
  pain_point_ids: ["leads.slow_follow_up"],
  ...over,
});

const item = (over: Partial<RawItem> = {}): RawItem => ({
  title: "Start a quote follow-up log",
  area: "crm",
  pain_point_ids: [],
  finding_refs: [1],
  why: "w",
  first_action: "a",
  dependencies: "",
  success_metric: "quotes followed up within 2 days",
  solution_ids: [],
  manual_alternative: "",
  impact: 3,
  urgency: 3,
  effort: 3,
  confidence: "medium",
  ...over,
});

describe("calculatedPriority", () => {
  it("is (impact × urgency × confidence) / effort on 1–5 scales", () => {
    expect(calculatedPriority({ impact: 5, urgency: 5, effort: 1, confidence: "high" })).toBe(125);
    expect(calculatedPriority({ impact: 4, urgency: 3, effort: 2, confidence: "medium" })).toBe(18);
    expect(calculatedPriority({ impact: 1, urgency: 1, effort: 5, confidence: "low" })).toBe(0.2);
  });

  it("clamps out-of-range inputs", () => {
    expect(calculatedPriority({ impact: 9, urgency: 0, effort: -2, confidence: "high" })).toBe(25);
  });
});

describe("toFindings", () => {
  it("maps sources to provenance classes and keeps only confirmed pain points", () => {
    const out = toFindings(
      [
        finding(),
        finding({ source: "pagespeed", pain_point_ids: ["made.up", "website.search_visibility"] }),
        finding({ source: "inference" }),
        finding({ source: "website" }),
      ],
      facts,
    );
    expect(out.map((f) => f.provenance)).toEqual(["customer_provided", "verified", "inferred", "verified"]);
    expect(out[1].pain_point_ids).toEqual(["website.search_visibility"]);
    expect(out.map((f) => f.position)).toEqual([1, 2, 3, 4]);
  });

  it("caps the number of findings", () => {
    expect(toFindings(Array.from({ length: 9 }, () => finding()), facts)).toHaveLength(MAX_FINDINGS);
  });
});

describe("toPlanItems", () => {
  const findings = toFindings([finding(), finding({ evidence: "Site has no contact form", source: "website" })], facts);

  it("derives the owner's priority, filters IDs and keeps the model's rank", () => {
    const [a, b] = toPlanItems(
      [
        item({ pain_point_ids: ["content.inconsistent"], solution_ids: ["content_studio", "teleport"], finding_refs: [2, 7, 2] }),
        item({ pain_point_ids: ["leads.slow_follow_up", "website.search_visibility", "nope"] }),
      ],
      findings,
      facts,
    );
    expect(a.customer_priority).toBeNull();
    expect(a.solution_ids).toEqual(["content_studio"]);
    expect(a.finding_positions).toEqual([2]);
    expect(a.evidence).toBe("Site has no contact form");
    expect(b.customer_priority).toBe(1);
    expect(b.pain_point_ids).toEqual(["leads.slow_follow_up", "website.search_visibility"]);
    expect([a.ai_priority, b.ai_priority]).toEqual([1, 2]);
  });

  it("uses the owner's urgency answer over the model's guess", () => {
    const [x] = toPlanItems([item({ pain_point_ids: ["website.search_visibility"], urgency: 5 })], findings, facts);
    expect(x.urgency).toBe(1);
    expect(x.urgency_from_owner).toBe(true);
    const [y] = toPlanItems([item({ urgency: 5 })], findings, facts);
    expect(y.urgency).toBe(5);
    expect(y.urgency_from_owner).toBe(false);
  });

  it("caps the plan length", () => {
    expect(toPlanItems(Array.from({ length: 10 }, () => item()), findings, facts)).toHaveLength(MAX_PLAN_ITEMS);
  });
});

describe("plan order", () => {
  const rows = [
    { id: "a", status: "proposed", customer_priority: null, calculated_priority: 100, ai_priority: 1 },
    { id: "b", status: "proposed", customer_priority: 2, calculated_priority: 5, ai_priority: 2 },
    { id: "c", status: "dismissed", customer_priority: 1, calculated_priority: 1, ai_priority: 3 },
    { id: "d", status: "accepted", customer_priority: null, calculated_priority: 40, ai_priority: 4 },
  ];

  it("puts the owner's priorities before any score", () => {
    expect(orderPlan(rows).map((r) => r.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("numbers the final plan without dismissed items", () => {
    expect(Object.fromEntries(finalPriorities(rows))).toEqual({ c: null, b: 1, a: 2, d: 3 });
  });
});

describe("capability", () => {
  it("separates what Braventa does today from what it doesn't", () => {
    const { available, notYet } = capability(["content_studio", "crm_intelligence", "kpi_framework", "x"]);
    expect(available.map((s) => s.label)).toEqual(["Content plan and drafts"]);
    expect(notYet.map((s) => s.availability)).toEqual(["planned", "manual"]);
  });
});
