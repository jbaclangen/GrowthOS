import { describe, expect, it } from "vitest";
import { ROLES } from "./roles";
import { SEAT_ALLOWANCES, SEAT_KINDS, seatAvailable, seatSummary, seatUsage } from "./seats";

describe("seat allowances (D-046)", () => {
  it("includes 2 / 5 / 10 full seats and 5 / 10 / unlimited analyst seats", () => {
    expect(SEAT_ALLOWANCES).toEqual({
      basic: { full: 2, analyst: 5 },
      pro: { full: 5, analyst: 10 },
      premium: { full: 10, analyst: null },
    });
  });

  it("gives every role a seat kind; only analyst and client approver aren't full", () => {
    expect(Object.keys(SEAT_KINDS).sort()).toEqual([...ROLES].sort());
    expect(ROLES.filter((r) => SEAT_KINDS[r] !== "full")).toEqual(["analyst", "client_approver"]);
  });

  it("counts members and open invites by seat; client approvers take neither", () => {
    expect(seatUsage(["owner", "admin", "analyst", "copywriter", "client_approver"])).toEqual({ full: 3, analyst: 1 });
  });

  it("refuses a full member at the limit but still lets an analyst in", () => {
    const usage = seatUsage(["owner", "admin"]);
    const full = seatAvailable("basic", usage, "copywriter");
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error).toContain("Basic plan includes 2 full seats");
    expect(seatAvailable("basic", usage, "analyst")).toEqual({ ok: true });
    expect(seatAvailable("pro", usage, "copywriter")).toEqual({ ok: true });
  });

  it("caps analysts per plan and never on Premium", () => {
    const five = seatUsage(["owner", "analyst", "analyst", "analyst", "analyst", "analyst"]);
    expect(seatAvailable("basic", five, "analyst").ok).toBe(false);
    expect(seatAvailable("pro", five, "analyst").ok).toBe(true);
    expect(seatAvailable("premium", { full: 1, analyst: 500 }, "analyst").ok).toBe(true);
  });

  it("never offers a client approver seat yet (D-047)", () => {
    expect(seatAvailable("premium", { full: 0, analyst: 0 }, "client_approver").ok).toBe(false);
  });

  it("summarizes seats without prices", () => {
    expect(seatSummary("basic", { full: 1, analyst: 0 })).toBe("1 of 2 full seats, 0 of 5 analyst seats");
    expect(seatSummary("premium", { full: 3, analyst: 1 })).toBe("3 of 10 full seats, 1 analyst seat (no limit)");
    expect(seatSummary("pro", { full: 5, analyst: 2 })).not.toMatch(/\$/);
  });
});
