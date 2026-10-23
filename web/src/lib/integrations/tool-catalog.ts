import { PAIN_POINTS, getPainPoint, isActivePainPointId } from "@/lib/onboarding/catalog";

// The tools the onboarding step "Connect your tools" and Settings → Connections show (D-041, INTEGRATIONS_ROADMAP §2).
// Only Google Search Console is live; every other tool is Coming soon and has no connect action. Its status must match
// FEATURES in lib/plans/tiers.ts (a test checks it). Suggestions come from the owner's confirmed pain points and the
// tools they named at the start (BI-12, business_profiles.current_tools), without an AI call. Pure logic, unit-tested.
//
// Claim rule (VOICE_AND_MESSAGING §5): present tense means it works today, so every coming-soon "helps" line starts
// with "Planned:". Search Console data isn't used in the diagnosis yet (D-051), so no line may say it is.

export type ToolId =
  | "search_console"
  | "google_analytics"
  | "google_business_profile"
  | "hubspot"
  | "facebook_instagram"
  | "linkedin"
  | "canva"
  | "heygen";

export type Tool = {
  id: ToolId;
  name: string;
  status: "live" | "coming_soon";
  // One line, plain words.
  helps: string;
  // Catalog pain point ids that suggest the tool.
  painPoints: string[];
  // Whole-word, case-insensitive matches in the tools the owner named.
  names: string[];
};

// Display order.
export const TOOLS: Tool[] = [
  {
    id: "search_console",
    name: "Google Search Console",
    status: "live",
    helps: "See how people find your website on Google Search: clicks, impressions, top searches and pages.",
    painPoints: ["website.search_visibility", "leads.too_few", "strategy.unclear_priorities", "reporting.no_clear_picture"],
    names: ["search console"],
  },
  {
    id: "google_analytics",
    name: "Google Analytics 4",
    status: "coming_soon",
    helps: "Planned: see which website visits turn into inquiries.",
    painPoints: [
      "website.low_conversion",
      "strategy.unclear_priorities",
      "strategy.budget_unmeasured",
      "reporting.no_clear_picture",
      "reporting.scattered_metrics",
      "reporting.slow_reports",
    ],
    names: ["google analytics", "ga4"],
  },
  {
    id: "google_business_profile",
    name: "Google Business Profile",
    status: "coming_soon",
    helps: "Planned: see how your business listing does in Google Search and Maps.",
    painPoints: ["website.search_visibility", "leads.too_few", "retention.no_feedback"],
    names: ["google business profile", "google my business"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    status: "coming_soon",
    helps: "Planned: see where leads stall in your sales pipeline.",
    painPoints: [
      "leads.slow_follow_up",
      "leads.low_conversion",
      "website.forms_disconnected",
      "crm.scattered_data",
      "crm.unclear_pipeline",
      "crm.messy_data",
      "crm.underused",
      "retention.no_follow_up",
      "retention.missed_upsell",
    ],
    names: ["hubspot"],
  },
  {
    id: "facebook_instagram",
    name: "Facebook and Instagram",
    status: "coming_soon",
    helps: "Planned: see which of your posts people engage with.",
    painPoints: ["content.inconsistent", "content.low_engagement"],
    names: ["facebook", "instagram"],
  },
  {
    id: "linkedin",
    name: "LinkedIn company page",
    status: "coming_soon",
    helps: "Planned: see how your company page posts perform.",
    painPoints: ["content.inconsistent", "content.low_engagement"],
    names: ["linkedin"],
  },
  {
    id: "canva",
    name: "Canva",
    status: "coming_soon",
    helps: "Planned: use your Canva designs and brand templates when you plan posts.",
    painPoints: ["content.too_slow", "content.voice_inconsistent"],
    names: ["canva"],
  },
  {
    id: "heygen",
    name: "HeyGen",
    status: "coming_soon",
    helps: "Planned: make avatar videos from scripts you approve.",
    painPoints: [],
    names: ["heygen"],
  },
];

export type ToolSuggestion = { tool: Tool; suggested: boolean; reasons: string[] };

export const MAX_REASONS = 2;
const NOT_SUGGESTED = 99;
const UNPRIORITIZED = 4;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeWord = (name: string) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
const CATALOG_ORDER = new Map(PAIN_POINTS.map((pp, i) => [pp.id, i]));

// Every tool once, suggested ones first. Among suggested: a tool the owner named, then the best priority of a
// confirmed pain point it helps with (1–3), then confirmed but unprioritized; ties keep TOOLS order.
export function suggestTools(input: {
  painPoints: { id: string; confirmed: boolean; priority: number | null }[];
  tools: string[];
}): ToolSuggestion[] {
  const pains = input.painPoints
    .filter((p) => p.confirmed && isActivePainPointId(p.id))
    .map((p) => ({ id: p.id, rank: p.priority && p.priority >= 1 && p.priority <= 3 ? p.priority : UNPRIORITIZED }))
    .sort((a, b) => a.rank - b.rank || (CATALOG_ORDER.get(a.id) ?? 0) - (CATALOG_ORDER.get(b.id) ?? 0));
  const entries = [...new Set(input.tools.map((t) => t.trim()).filter(Boolean))];

  return TOOLS.map((tool, order) => {
    const patterns = tool.names.map(wholeWord);
    const named = entries.filter((e) => patterns.some((p) => p.test(e)));
    const picked = pains.filter((p) => tool.painPoints.includes(p.id));
    const reasons = [
      ...named.map((e) => `You said you use ${e}.`),
      ...picked.map((p) => `You picked “${getPainPoint(p.id)!.label}”.`),
    ].slice(0, MAX_REASONS);
    const rank = named.length ? 0 : picked.length ? picked[0].rank : NOT_SUGGESTED;
    return { tool, suggested: rank !== NOT_SUGGESTED, reasons, rank, order };
  })
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ tool, suggested, reasons }) => ({ tool, suggested, reasons }));
}
