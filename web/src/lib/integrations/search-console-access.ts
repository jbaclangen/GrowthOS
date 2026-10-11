import { canUse, effectiveAccess } from "@/lib/plans/tiers";

// Who may use the Google Search Console connection (founder decision 2026-10-11): integrations that bring in more
// data need Pro. A 14-day Pro trial counts as Pro. After the trial, on Basic, the connection is paused: its data is
// kept, nothing new is fetched, and it resumes on Pro or Premium. Pure logic, unit-tested (mirrors lib/mcp/access.ts).

export type SearchConsoleAccess = { allowed: true } | { allowed: false; reason: string };

export const SEARCH_CONSOLE_PAUSED_MESSAGE =
  "The Google Search Console connection is a Pro feature. It's paused because this business is on Basic: your data is kept, but nothing new is fetched until you move to Pro.";

export function searchConsoleAccess(org: { plan: string; trial_ends_at: string | Date }, now = new Date()): SearchConsoleAccess {
  const { tier } = effectiveAccess(org, now);
  return canUse(tier, "search_console") ? { allowed: true } : { allowed: false, reason: SEARCH_CONSOLE_PAUSED_MESSAGE };
}
