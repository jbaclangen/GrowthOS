// Seat allowances per plan (founder decision D-046) and whether one more person fits. Pure logic, unit-tested in
// seats.test.ts. There is no checkout yet, so a full business can't buy a seat: Settings refuses the invite and points
// to the plans page. Seat prices stay off the app and the site until checkout exists (D-039, D-046).
//
// A full seat is every role except analyst and client approver; the owner takes one. Analyst seats are free up to their
// own cap. Client approvers (D-047) can't be invited yet, so they have no allowance here. An open invitation holds its
// seat until it is accepted, revoked or expires, so a business can't hand out more links than it has seats.

import type { Tier } from "@/lib/plans/tiers";
import type { Role } from "./roles";

export type SeatKind = "full" | "analyst" | "client_approver";

// null = unlimited.
export const SEAT_ALLOWANCES: Record<Tier, { full: number; analyst: number | null }> = {
  basic: { full: 2, analyst: 5 },
  pro: { full: 5, analyst: 10 },
  premium: { full: 10, analyst: null },
};

const TIER_LABELS: Record<Tier, string> = { basic: "Basic", pro: "Pro", premium: "Premium" };

export const SEAT_KINDS: Record<Role, SeatKind> = {
  owner: "full",
  admin: "full",
  marketing_manager: "full",
  social_media_manager: "full",
  copywriter: "full",
  content_creator: "full",
  analyst: "analyst",
  client_approver: "client_approver",
};

export const seatKind = (role: Role): SeatKind => SEAT_KINDS[role];

export type SeatUsage = { full: number; analyst: number };

// Members and open invitations, counted by the seat each one takes.
export function seatUsage(roles: readonly Role[]): SeatUsage {
  const usage = { full: 0, analyst: 0 };
  for (const role of roles) {
    const kind = seatKind(role);
    if (kind === "full") usage.full++;
    else if (kind === "analyst") usage.analyst++;
  }
  return usage;
}

// Whether one more person with this role fits the plan. The message names the plan and what to do.
export function seatAvailable(tier: Tier, usage: SeatUsage, role: Role): { ok: true } | { ok: false; error: string } {
  const allowance = SEAT_ALLOWANCES[tier];
  const kind = seatKind(role);
  if (kind === "client_approver") return { ok: false, error: "Client approvers can't be invited yet." };
  const limit = kind === "full" ? allowance.full : allowance.analyst;
  const used = kind === "full" ? usage.full : usage.analyst;
  if (limit === null || used < limit) return { ok: true };
  const what = kind === "full" ? `${limit} full seats` : `${limit} analyst seats`;
  return {
    ok: false,
    error: `Your ${TIER_LABELS[tier]} plan includes ${what}, and all of them are taken or invited. Remove someone or withdraw an invite, invite them as ${kind === "full" ? "an analyst" : "a full member"} instead, or ask about a bigger plan on Plans.`,
  };
}

// "2 of 5 full seats, 1 of 10 analyst seats" for Settings.
export function seatSummary(tier: Tier, usage: SeatUsage): string {
  const a = SEAT_ALLOWANCES[tier];
  const analyst = a.analyst === null ? `${usage.analyst} analyst ${usage.analyst === 1 ? "seat" : "seats"} (no limit)` : `${usage.analyst} of ${a.analyst} analyst seats`;
  return `${usage.full} of ${a.full} full seats, ${analyst}`;
}
