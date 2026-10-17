import { hasSubscription } from "@/lib/plans/subscription";

// Who may use the in-app assistant ("Ask Braventa", D-043): the same rule as the AI assistant connection (D-036).
// Every account during the 14-day trial, then any plan (Basic, Pro or Premium). Pure logic, unit-tested.
// This is the gate, not canUse(tier, "ai_assistant"): a trial that ended without a plan is effective Basic, yet the
// assistant pauses until the business chooses a plan (FEATURES says so in the feature's detail).

export type AssistantAccess = { allowed: true } | { allowed: false; reason: string };

export const ASSISTANT_NEEDS_PLAN = "Choose a plan to use the assistant.";

export function assistantAccess(org: { plan: string; trial_ends_at: string | Date } | null, now = new Date()): AssistantAccess {
  if (!org) return { allowed: false, reason: ASSISTANT_NEEDS_PLAN };
  return hasSubscription(org, now) ? { allowed: true } : { allowed: false, reason: ASSISTANT_NEEDS_PLAN };
}

// Daily and burst limits, counted in assistant_usage: one row per question, reserved before the model is called by
// reserve_assistant_question (migration 20261017020224_assistant_usage.sql), which counts and inserts under a
// per-organization lock. Parallel requests can't all pass, and questions that fail still count.
export const ASSISTANT_LIMITS = {
  perOrgPerDay: 40,
  perUserPerMinute: 5,
} as const;

export type LimitCheck = { allowed: true; remainingToday: number } | { allowed: false; reason: string };

// The same comparison the database function makes, for the user-facing reason and what's left today.
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
