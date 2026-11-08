import type { Access } from "./tiers";

// A business's plan in a few words (D-030): the header chip, the business switcher and Settings → Businesses.
export function planLabel(access: Access): string {
  if (access.trial?.active) return `Pro trial · ${access.trial.daysLeft} day${access.trial.daysLeft === 1 ? "" : "s"} left`;
  return access.tier === "basic" ? "Basic" : access.tier === "pro" ? "Pro" : "Premium";
}
