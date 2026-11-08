// How many businesses one Braventa account may own, and which plan a new one starts on (founder decisions
// 2026-11-08, D-062; docs/product/PLANS_AND_TIERS.md §2a). Pure logic, unit-tested; the database applies the same
// rules in create_organization() (supabase/migrations/20261108103906_business_limits.sql), and
// business-limit.test.ts checks the two agree.
//
// An account is a person. The businesses it owns are the organizations where that person's role is owner. Deleting
// one frees its slot. The limit comes from the highest plan any of those businesses is on right now (an active trial
// counts as Pro); with none, Basic's.

import { TRIAL_DAYS, effectiveAccess, type Tier } from "./tiers";

export const BUSINESS_LIMITS: Record<Tier, number> = { basic: 2, pro: 4, premium: 8 };

// More than Premium's limit needs a custom plan, through "Talk to us" on /plans (upgrade_requests).
export const MAX_BUSINESSES = BUSINESS_LIMITS.premium;

type OrgPlan = { plan: string; trial_ends_at: string | Date };

const RANK: Record<Tier, number> = { basic: 1, pro: 2, premium: 3 };

// The plan that sets the account's limit: the highest effective tier among the businesses it owns.
export function accountTier(owned: OrgPlan[], now = new Date()): Tier {
  let best: Tier = "basic";
  for (const org of owned) {
    const tier = effectiveAccess(org, now).tier;
    if (RANK[tier] > RANK[best]) best = tier;
  }
  return best;
}

export type BusinessUsage = { tier: Tier; limit: number; used: number; atLimit: boolean };

export function businessUsage(owned: OrgPlan[], now = new Date()): BusinessUsage {
  const tier = accountTier(owned, now);
  const limit = BUSINESS_LIMITS[tier];
  return { tier, limit, used: owned.length, atLimit: owned.length >= limit };
}

export const businessesLabel = (n: number) => `${n} business${n === 1 ? "" : "es"}`;

// Shown wherever a new business is refused: what happened, and what to do.
export function limitMessage(usage: Pick<BusinessUsage, "tier" | "limit">): string {
  if (usage.tier === "premium") {
    return `Your account already has ${businessesLabel(usage.limit)}, the most a plan includes. To add more, talk to us about a custom plan, or remove a business you no longer need.`;
  }
  return `Your account already has ${businessesLabel(usage.limit)}, the most your plan includes. Move to a higher plan to add more, or remove a business you no longer need.`;
}

// The plan a new business starts on. The 14-day Pro trial belongs to the account, once: the first business starts it,
// and every business added while it runs ends with it. A business added after it ended starts on an ended trial
// (effective Basic, AI assistant paused until it's on a plan), so deleting a business and scanning again doesn't
// restart the trial. An account with a business on a plan (set by the Braventa team; no billing yet) adds new
// businesses on its highest plan: the plan covers the account's businesses up to its limit.
export function newBusinessPlan(
  owned: { plan: string }[],
  accountTrialEndsAt: string | Date | null,
  now = new Date(),
): { plan: "trial" | Tier; trialEndsAt: Date; startsTrial: boolean } {
  const paid = owned
    .map((o) => o.plan)
    .filter((p): p is Tier => p === "basic" || p === "pro" || p === "premium")
    .sort((a, b) => RANK[b] - RANK[a])[0];
  if (paid) return { plan: paid, trialEndsAt: now, startsTrial: false };
  if (accountTrialEndsAt) return { plan: "trial", trialEndsAt: new Date(accountTrialEndsAt), startsTrial: false };
  return { plan: "trial", trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 86_400_000), startsTrial: true };
}
