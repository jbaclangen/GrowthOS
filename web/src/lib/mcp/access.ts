import { hasSubscription } from "@/lib/plans/subscription";

// Who may use the AI assistant connection (founder decision D-036): every plan during the 14-day trial; it pauses
// when the trial ends and comes back once the business is on a plan (Basic, Pro or Premium/Custom). There is no
// billing yet, so "on a plan" means organizations.plan was set by the Braventa team. Pure logic, unit-tested.
// The in-app assistant uses the same rule (lib/assistant/access.ts).

export type McpAccess = { allowed: true } | { allowed: false; reason: string };

export const TRIAL_ENDED_MESSAGE =
  "Braventa's AI assistant connection is paused because the free trial has ended. Choose a plan in Braventa (Plans → Talk to us) and it will work again.";

export function mcpAccess(org: { plan: string; trial_ends_at: string | Date }, now = new Date()): McpAccess {
  return hasSubscription(org, now) ? { allowed: true } : { allowed: false, reason: TRIAL_ENDED_MESSAGE };
}
