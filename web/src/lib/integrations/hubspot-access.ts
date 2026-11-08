import { canUse, effectiveAccess } from "@/lib/plans/tiers";

// Who may use the HubSpot connection (D-048): like Search Console, integrations that bring in more data need Pro, and
// the 14-day Pro trial counts as Pro. After the trial, on Basic, the connection is paused: the stored counts are kept,
// nothing new is fetched, and it resumes on Pro or Premium. Pure logic, unit-tested (mirrors search-console-access.ts).

export type HubSpotAccess = { allowed: true } | { allowed: false; reason: string };

export const HUBSPOT_PAUSED_MESSAGE =
  "The HubSpot connection is a Pro feature. It's paused because this business is on Basic: the counts already fetched are kept, but nothing new is fetched until you move to Pro.";

export function hubspotAccess(org: { plan: string; trial_ends_at: string | Date }, now = new Date()): HubSpotAccess {
  const { tier } = effectiveAccess(org, now);
  return canUse(tier, "hubspot") ? { allowed: true } : { allowed: false, reason: HUBSPOT_PAUSED_MESSAGE };
}
