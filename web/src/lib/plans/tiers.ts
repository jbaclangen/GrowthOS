// Subscription tiers, the 14-day Pro trial and what each tier includes (founder decision D-030).
// Pure logic only (no I/O), so it is unit-tested. There is no billing yet: an organization's plan is changed by
// the Braventa team, and a trial ends on its own.
//
// Rule (CLAUDE.md): never present a planned feature as live. Every feature carries its real status, and the UI
// labels anything not live as "Coming soon".

export type Tier = "basic" | "pro" | "premium";
export type StoredPlan = "trial" | Tier;
export type FeatureStatus = "live" | "coming_soon";

export const TRIAL_DAYS = 14;

export const TIERS: Record<Tier, { label: string; summary: string }> = {
  basic: {
    label: "Basic",
    summary: "Business intelligence, a marketing audit and a prioritized plan. Braventa recommends; you carry out the changes.",
  },
  pro: {
    label: "Pro",
    summary: "Everything in Basic, plus your Google Search Console data in Braventa. Coming soon: a full marketing audit, more connected tools and AI agents that carry out approved changes for you.",
  },
  premium: {
    label: "Premium",
    summary: "Everything in Pro, plus custom integrations with the systems your business runs on (coming soon).",
  },
};

export type FeatureId =
  | "website_analysis"
  | "discovery"
  | "diagnosis"
  | "growth_plan"
  | "content_plan"
  | "ai_assistant"
  | "assistant_connection"
  | "full_audit"
  | "search_console"
  | "analytics_integrations"
  | "creative_integrations"
  | "channel_integrations"
  | "ai_agents"
  | "custom_integrations";

export type Feature = { id: FeatureId; label: string; detail: string; minTier: Tier; status: FeatureStatus };

// Ordered as the plans page shows them. minTier = the lowest tier that includes it.
export const FEATURES: Feature[] = [
  { id: "website_analysis", label: "Website analysis and business profile", detail: "Reads your website and Google PageSpeed scores.", minTier: "basic", status: "live" },
  { id: "discovery", label: "Guided discovery", detail: "Pick what's holding the business back and answer a few follow-up questions.", minTier: "basic", status: "live" },
  { id: "diagnosis", label: "Growth score and diagnosis", detail: "Findings marked by evidence, which you confirm or correct.", minTier: "basic", status: "live" },
  { id: "growth_plan", label: "Prioritized growth plan", detail: "Recommended actions with first steps; accept, dismiss or mark done.", minTier: "basic", status: "live" },
  { id: "content_plan", label: "30-day content plan and drafted posts", detail: "Drafts in your brand voice for you to approve or reject. Braventa doesn't publish them.", minTier: "basic", status: "live" },
  // Every plan during the trial, then any plan; read-only (D-042, lib/assistant/access.ts).
  { id: "ai_assistant", label: "In-app AI assistant", detail: "Ask how Braventa works and about your latest report, from the search bar in the header. Answers only; it can't make changes for you.", minTier: "basic", status: "live" },
  // Every plan during the trial; paused after it until the business is on a plan (D-036, lib/mcp/access.ts).
  { id: "assistant_connection", label: "Connect your AI assistant", detail: "Let Claude answer the setup questions from what it already knows about your business (Claude Code and Claude Desktop). Paused after the trial until you choose a plan.", minTier: "basic", status: "live" },
  { id: "full_audit", label: "Full marketing audit", detail: "SEO, search ads, social media, email and video.", minTier: "pro", status: "coming_soon" },
  // Read-only; paused after the trial on Basic, data kept (founder decision 2026-10-11, lib/integrations/search-console-access.ts).
  // When the diagnosis prompt uses this data (searchConsoleSummaryForPrompt), drop "coming soon" from the detail.
  { id: "search_console", label: "Google Search Console connection", detail: "Read-only clicks, impressions, top search queries and pages for your website, shown in Braventa. Using them in your diagnosis is coming soon.", minTier: "pro", status: "live" },
  { id: "analytics_integrations", label: "Analytics connections", detail: "Google Analytics 4 and Tag Manager.", minTier: "pro", status: "coming_soon" },
  { id: "creative_integrations", label: "Creative tool connections", detail: "Canva, HeyGen and Higgsfield.", minTier: "pro", status: "coming_soon" },
  { id: "channel_integrations", label: "Website and social connections", detail: "WordPress and your social media accounts.", minTier: "pro", status: "coming_soon" },
  { id: "ai_agents", label: "AI agents that carry out fixes", detail: "Agents apply recommended changes in your connected tools, each one only after you approve it.", minTier: "pro", status: "coming_soon" },
  { id: "custom_integrations", label: "Custom integrations", detail: "E-commerce platforms, QuickBooks, Xero and other systems, scoped with you.", minTier: "premium", status: "coming_soon" },
];

const RANK: Record<Tier, number> = { basic: 1, pro: 2, premium: 3 };

export function includes(tier: Tier, feature: Feature) {
  return RANK[tier] >= RANK[feature.minTier];
}

// A feature is usable only when the tier includes it AND it is live.
export function canUse(tier: Tier, featureId: FeatureId) {
  const feature = FEATURES.find((f) => f.id === featureId);
  return Boolean(feature && feature.status === "live" && includes(tier, feature));
}

export type Access = {
  tier: Tier;
  stored: StoredPlan;
  trial: { active: boolean; endsAt: Date; daysLeft: number } | null;
};

// The tier an organization has right now. A "trial" plan is Pro until trial_ends_at, then Basic.
export function effectiveAccess(org: { plan: string; trial_ends_at: string | Date }, now = new Date()): Access {
  const endsAt = new Date(org.trial_ends_at);
  const stored: StoredPlan = (["trial", "basic", "pro", "premium"] as const).includes(org.plan as StoredPlan)
    ? (org.plan as StoredPlan)
    : "basic";
  if (stored !== "trial") return { tier: stored, stored, trial: null };
  const msLeft = endsAt.getTime() - now.getTime();
  const active = msLeft > 0;
  return {
    tier: active ? "pro" : "basic",
    stored,
    trial: { active, endsAt, daysLeft: active ? Math.ceil(msLeft / 86_400_000) : 0 },
  };
}

// Whether Pro adds anything usable today; the UI says so plainly instead of implying it does.
export function proHasLiveFeatures() {
  return FEATURES.some((f) => f.minTier === "pro" && f.status === "live");
}
