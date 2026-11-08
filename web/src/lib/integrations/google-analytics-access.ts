import { canUse, effectiveAccess } from "@/lib/plans/tiers";

// Who may use the Google Analytics 4 connection (founder decision 2026-11-08): like Search Console, a Pro feature. A
// 14-day Pro trial counts as Pro. After the trial, on Basic, it is paused: its data is kept, nothing new is fetched,
// and it resumes on Pro or Premium. Pure logic, unit-tested.

export type GoogleAnalyticsAccess = { allowed: true } | { allowed: false; reason: string };

export const GOOGLE_ANALYTICS_PAUSED_MESSAGE =
  "The Google Analytics connection is a Pro feature. It's paused because this business is on Basic: your data is kept, but nothing new is fetched until you move to Pro.";

export function googleAnalyticsAccess(org: { plan: string; trial_ends_at: string | Date }, now = new Date()): GoogleAnalyticsAccess {
  const { tier } = effectiveAccess(org, now);
  return canUse(tier, "google_analytics") ? { allowed: true } : { allowed: false, reason: GOOGLE_ANALYTICS_PAUSED_MESSAGE };
}
