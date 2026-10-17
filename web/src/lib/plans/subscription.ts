// Whether an organization has a subscription right now: an active 14-day trial, or a plan set by the Braventa
// team (Basic, Pro or Premium; there is no billing yet). Shared by the AI assistant connection (MCP, D-036) and the
// in-app assistant (D-043). Pure logic, unit-tested.

export function hasSubscription(org: { plan: string; trial_ends_at: string | Date }, now = new Date()) {
  if (org.plan === "basic" || org.plan === "pro" || org.plan === "premium") return true;
  return org.plan === "trial" && new Date(org.trial_ends_at).getTime() > now.getTime();
}
