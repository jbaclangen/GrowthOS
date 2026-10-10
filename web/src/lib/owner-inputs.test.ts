import { describe, expect, it } from "vitest";
import { fromProfileRow, hasOwnerInputs, parseOwnerInputs, toProfileColumns } from "./owner-inputs";

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

describe("parseOwnerInputs", () => {
  it("treats a blank form as no answers", () => {
    const r = parseOwnerInputs(form({ goal: "", serviceArea: "", toolsOther: "" }));
    expect(r).toEqual({ data: { goal: null, serviceArea: null, tools: [] } });
    if ("data" in r) expect(hasOwnerInputs(r.data)).toBe(false);
  });

  it("keeps a preset goal, trims text and merges free-text tools without duplicates", () => {
    const r = parseOwnerInputs(
      form({
        goal: "More leads and inquiries",
        serviceArea: "  Dallas–Fort Worth ",
        tools: ["HubSpot", "Facebook"],
        toolsOther: "Canva, Jobber, Canva, ",
      }),
    );
    expect(r).toEqual({
      data: { goal: "More leads and inquiries", serviceArea: "Dallas–Fort Worth", tools: ["HubSpot", "Facebook", "Canva", "Jobber"] },
    });
  });

  it("uses the custom goal when 'something else' is chosen", () => {
    const r = parseOwnerInputs(form({ goal: "other", goalOther: "Hire two technicians" }));
    expect("data" in r && r.data.goal).toBe("Hire two technicians");
  });

  it("ignores goals and tools that aren't offered options", () => {
    const r = parseOwnerInputs(form({ goal: "<script>", tools: ["Evil tool"] }));
    expect(r).toEqual({ data: { goal: null, serviceArea: null, tools: [] } });
  });

  it("rejects over-long text and too many tools with a clear message", () => {
    expect(parseOwnerInputs(form({ serviceArea: "x".repeat(201) }))).toEqual({
      error: "Keep the service area under 200 characters",
    });
    const many = Array.from({ length: 16 }, (_, i) => `tool${i}`).join(",");
    expect(parseOwnerInputs(form({ toolsOther: many }))).toEqual({ error: "List up to 15 tools" });
  });
});

describe("profile column mapping", () => {
  it("round-trips through the business_profiles columns", () => {
    const inputs = { goal: "More leads and inquiries", serviceArea: "Texas", tools: ["HubSpot"] };
    const cols = toProfileColumns(inputs);
    expect(cols).toEqual({ goals: inputs.goal, service_area: "Texas", current_tools: ["HubSpot"] });
    expect(fromProfileRow(cols)).toEqual(inputs);
  });
});
