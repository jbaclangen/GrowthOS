import { hasSubscription } from "@/lib/plans/subscription";

// Who may use the in-app assistant ("Ask Braventa", D-042): the same rule as the AI assistant connection (D-036).
// Every account during the 14-day trial, then any plan (Basic, Pro or Premium). Pure logic, unit-tested.

export type AssistantAccess = { allowed: true } | { allowed: false; reason: string };

export const ASSISTANT_NEEDS_PLAN = "Choose a plan to use the assistant.";

export function assistantAccess(org: { plan: string; trial_ends_at: string | Date } | null, now = new Date()): AssistantAccess {
  if (!org) return { allowed: false, reason: ASSISTANT_NEEDS_PLAN };
  return hasSubscription(org, now) ? { allowed: true } : { allowed: false, reason: ASSISTANT_NEEDS_PLAN };
}

// Daily and burst limits. Counted from assistant_messages (one row per answered question).
export const ASSISTANT_LIMITS = {
  perOrgPerDay: 40,
  perUserPerMinute: 5,
} as const;

export type LimitCheck = { allowed: true; remainingToday: number } | { allowed: false; reason: string };

export function checkAssistantLimits(
  counts: { orgLastDay: number; userLastMinute: number },
  limits: { perOrgPerDay: number; perUserPerMinute: number } = ASSISTANT_LIMITS,
): LimitCheck {
  if (counts.orgLastDay >= limits.perOrgPerDay) {
    return {
      allowed: false,
      reason: `Your business has asked ${limits.perOrgPerDay} questions in the last 24 hours, which is the daily limit. Try again tomorrow.`,
    };
  }
  if (counts.userLastMinute >= limits.perUserPerMinute) {
    return { allowed: false, reason: "You're asking faster than the assistant can keep up. Wait a minute, then try again." };
  }
  return { allowed: true, remainingToday: limits.perOrgPerDay - counts.orgLastDay - 1 };
}

// Start of each counting window, as ISO timestamps for the queries.
export function limitWindows(now = new Date()) {
  return {
    dayStart: new Date(now.getTime() - 86_400_000).toISOString(),
    minuteStart: new Date(now.getTime() - 60_000).toISOString(),
  };
}
