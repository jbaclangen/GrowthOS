import { describe, expect, it } from "vitest";
import { topOpportunities } from "./google";

describe("topOpportunities", () => {
  it("keeps failing audits with savings, largest first, from either savings field", () => {
    const out = topOpportunities({
      "render-blocking-insight": { title: "Render-blocking requests", score: 0, metricSavings: { LCP: 0, FCP: 4350 } },
      "unused-javascript": { title: "Reduce unused JavaScript", score: 0.5, details: { type: "opportunity", overallSavingsMs: 1800 } },
      "image-delivery-insight": { title: "Improve image delivery", score: 0, metricSavings: { LCP: 1500 } },
      passing: { title: "Already fine", score: 1, details: { type: "opportunity", overallSavingsMs: 900 } },
      informative: { title: "No score", score: null, metricSavings: { LCP: 2000 } },
      tiny: { title: "Tiny", score: 0, metricSavings: { LCP: 50 } },
    });
    expect(out.map((o) => [o.id, o.savingsMs])).toEqual([
      ["render-blocking-insight", 4350],
      ["unused-javascript", 1800],
      ["image-delivery-insight", 1500],
    ]);
  });
});
