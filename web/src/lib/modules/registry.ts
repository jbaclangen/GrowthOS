import { FEATURES, type FeatureId, type Tier } from "@/lib/plans/tiers";
import type { Provenance } from "@/lib/plan/priority";

// Feature modules (founder decision D-051): the capability areas Braventa's analysis is made of, and the one place
// that says which modules exist, which tier includes each one, and which are live. Pure logic (no I/O), so it is
// unit-tested, like tiers.ts.
//
// D-051 steps 1–5 (this registry, the organization_modules and module_runs tables, module_id on findings and plan
// items, the growth score computed over modules in lib/modules/score.ts) change no result an owner sees. The
// pipeline is four live modules in Basic, plus Search visibility (D-051 step 6, Pro: Google Search Console data in
// the diagnosis and the score; FEATURE_MODULES.md §9). Every other module stays "coming soon" until the PR that
// ships it sets `live` (CLAUDE.md: never present a planned feature as live). Adding a module also means a migration
// that extends the module_id domain in the database (migration.test.ts checks that the two lists agree).

export type ModuleId =
  | "business_intel"
  | "website_seo"
  | "conversion"
  | "content_studio"
  | "search_visibility"
  | "local_seo"
  | "social"
  | "search_ads"
  | "email"
  | "video"
  | "crm"
  | "analytics"
  | "automation"
  | "custom_integrations";

export type ModuleDef = {
  id: ModuleId;
  // Descriptive display name (D-010; Q-036: the shorter names).
  label: string;
  summary: string;
  // The lowest tier that includes the module (D-051's module-to-tier map).
  tier: Tier;
  // The plans-page feature (FEATURES in tiers.ts) the module is gated with, when one exists. Its minTier must equal
  // `tier`, and a live module's feature must be live (registry.test.ts).
  featureId: FeatureId | null;
  // The code does it today. Only modules in the current pipeline are live.
  live: boolean;
  // The module's weight in the growth score: the sum of its parts' weights when it has full evidence
  // (lib/modules/score.ts builds the parts; score.test.ts checks the sum). null when the module isn't scored today:
  // an output module, or a scored module whose weight is decided when it ships.
  scoreWeight: number | null;
  // What its sub-score measures, or null for a module that is never scored (it produces outputs, not evidence).
  subScore: string | null;
  // audit_findings.category values the module owns (the website checks today).
  findingCategories: string[];
  // growth_plan_items.area values (the plan prompt's list) that belong to the module; see moduleForArea.
  planAreas: string[];
};

// In display order. The growth plan itself is the core that combines modules, not a module.
export const MODULES: readonly ModuleDef[] = [
  {
    id: "business_intel",
    label: "Business intelligence",
    summary: "Who the business is: the profile read from the website, your goal, service area and tools, and what you told us is holding it back.",
    tier: "basic",
    featureId: "website_analysis",
    live: true,
    scoreWeight: null,
    subScore: null,
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "website_seo",
    label: "Website and technical SEO",
    summary: "Site health and indexability: the crawl of up to 25 pages, the technical checks and Google PageSpeed.",
    tier: "basic",
    featureId: "website_analysis",
    live: true,
    // PageSpeed mobile: performance 0.15, SEO 0.12, accessibility 0.04, best practices 0.04.
    scoreWeight: 0.35,
    subScore: "Website health",
    findingCategories: ["indexability", "technical", "on_page", "structured_data", "performance"],
    planAreas: ["website", "seo"],
  },
  {
    id: "conversion",
    label: "Conversion and messaging",
    summary: "Whether the website turns visitors into inquiries: clarity, calls to action, trust, and how the business shows up online.",
    tier: "basic",
    featureId: "diagnosis",
    live: true,
    // Braventa's assessed scores: content clarity 0.25, conversion readiness 0.25, online presence 0.15. Online
    // presence stays here until the social media module is live; moving it changes the score (bump SCORE_VERSION).
    scoreWeight: 0.65,
    subScore: "Conversion readiness",
    findingCategories: [],
    planAreas: ["conversion"],
  },
  {
    id: "content_studio",
    label: "Content studio",
    summary: "The 30-day content plan and the drafted posts you approve or reject.",
    tier: "basic",
    featureId: "content_plan",
    live: true,
    scoreWeight: null,
    subScore: null,
    findingCategories: [],
    planAreas: ["content"],
  },
  {
    id: "search_visibility",
    label: "Search visibility",
    summary: "Real search demand from Google Search Console: clicks, impressions, average position and the pages Google shows, in the diagnosis and the growth score.",
    tier: "pro",
    featureId: "search_console",
    live: true,
    // Average position 0.04, click-through rate 0.02, clicks against the previous 28 days 0.02, pages with
    // impressions 0.01, home page indexed 0.01 (FEATURE_MODULES.md §9, provisional). Nothing without a snapshot or
    // with fewer than 10 impressions.
    scoreWeight: 0.1,
    subScore: "Search visibility",
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "local_seo",
    label: "Local SEO",
    summary: "Map and local pack presence: Google Business Profile, name, address and phone consistency.",
    tier: "pro",
    featureId: "full_audit",
    live: false,
    scoreWeight: null,
    subScore: "Local presence",
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "social",
    label: "Social media",
    summary: "Channel presence and consistency across connected social accounts.",
    tier: "pro",
    featureId: "channel_integrations",
    live: false,
    scoreWeight: null,
    subScore: "Social presence",
    findingCategories: [],
    planAreas: ["social"],
  },
  {
    id: "search_ads",
    label: "Search ads",
    summary: "Spend efficiency of search advertising, read-only.",
    tier: "pro",
    featureId: "full_audit",
    live: false,
    scoreWeight: null,
    subScore: "Paid efficiency",
    findingCategories: [],
    planAreas: ["ads"],
  },
  {
    id: "email",
    label: "Email marketing",
    summary: "List and nurture health from the connected email tool, read-only.",
    tier: "pro",
    featureId: "full_audit",
    live: false,
    scoreWeight: null,
    subScore: "Email health",
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "video",
    label: "Video",
    summary: "Video presence and drafts with the connected video tools.",
    tier: "pro",
    featureId: "full_audit",
    live: false,
    scoreWeight: null,
    subScore: "Video presence",
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "crm",
    label: "CRM intelligence",
    summary: "Lead follow-up gaps from the connected CRM, read-only.",
    tier: "pro",
    featureId: null,
    live: false,
    scoreWeight: null,
    subScore: "Lead follow-up",
    findingCategories: [],
    planAreas: ["crm"],
  },
  {
    id: "analytics",
    label: "Analytics",
    summary: "Tracking and outcomes: Google Analytics 4 and Tag Manager checks, planned against actual.",
    tier: "pro",
    featureId: "analytics_integrations",
    live: false,
    scoreWeight: null,
    subScore: "Measurement readiness",
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "automation",
    label: "Automation",
    summary: "Agents that carry out approved plan items in your connected tools.",
    tier: "pro",
    featureId: "ai_agents",
    live: false,
    scoreWeight: null,
    subScore: null,
    findingCategories: [],
    planAreas: [],
  },
  {
    id: "custom_integrations",
    label: "Custom integrations",
    summary: "The systems your business runs on, scoped with you.",
    tier: "premium",
    featureId: "custom_integrations",
    live: false,
    scoreWeight: null,
    subScore: null,
    findingCategories: [],
    planAreas: [],
  },
];

export const MODULE_IDS: readonly ModuleId[] = MODULES.map((m) => m.id);

const BY_ID = new Map<ModuleId, ModuleDef>(MODULES.map((m) => [m.id, m]));

export function getModule(id: ModuleId): ModuleDef {
  return BY_ID.get(id)!;
}

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && BY_ID.has(value as ModuleId);
}

export function moduleLabel(id: ModuleId): string {
  return getModule(id).label;
}

export function liveModules(): ModuleDef[] {
  return MODULES.filter((m) => m.live);
}

const RANK: Record<Tier, number> = { basic: 1, pro: 2, premium: 3 };

export type ModuleOverride = { module_id: string; enabled: boolean };

// The modules whose evidence feeds an organization's growth score: the live modules its tier includes, minus any it
// switched off (organization_modules, enabled = false). An override can't switch on a module that isn't live or
// that the tier doesn't include. Nothing writes overrides yet, so today this is the four Basic modules for everyone,
// plus Search visibility on Pro, Premium and the trial. Overrides affect the score and the Search Console evidence
// in the diagnosis, and nothing else: the analysis steps still run, because no module can be switched off from the
// app yet.
export function enabledModuleIds(tier: Tier, overrides: readonly ModuleOverride[] = []): Set<ModuleId> {
  const off = new Set(overrides.filter((o) => !o.enabled).map((o) => o.module_id));
  return new Set(MODULES.filter((m) => m.live && RANK[tier] >= RANK[m.tier] && !off.has(m.id)).map((m) => m.id));
}

// The module a plan item belongs to, from its area. The plan prompt asks for one of website, seo, content,
// conversion, social, crm, ads or operations, but the column is free text and the schema joins a list into
// "seo, content": take the first value, match it case-insensitively, and leave operations, unknown and empty values
// null. The feature_modules migration backfills existing rows with the same rule (migration.test.ts).
export function moduleForArea(area: string): ModuleId | null {
  const first = area.split(",")[0].trim().toLowerCase();
  if (!first) return null;
  return MODULES.find((m) => m.planAreas.includes(first))?.id ?? null;
}

// The ref the diagnosis prompt gives the Google Search Console summary (lib/pipeline/prompts.ts). The prompt
// reserves it for findings whose source is Search Console, so a finding that cites it rests on that data.
export const SEARCH_CONSOLE_REF = "G1";

// The module a diagnosis finding belongs to, from where its evidence comes from: a verified finding that cites the
// Search Console summary belongs to search visibility, any other verified finding cites the website checks or
// PageSpeed (website and technical SEO); one the owner provided belongs to business intelligence; an inferred one
// is the model's reasoning and belongs to no module. Without refs this is the migration's backfill rule.
export function moduleForFinding(finding: { provenance: Provenance; audit_refs?: readonly string[] }): ModuleId | null {
  switch (finding.provenance) {
    case "verified":
      return finding.audit_refs?.includes(SEARCH_CONSOLE_REF) ? "search_visibility" : "website_seo";
    case "customer_provided":
      return "business_intel";
    case "inferred":
      return null;
  }
}

// The plans-page feature a module is gated with, for the registry test and for cards that show its status.
export function moduleFeature(module: ModuleDef) {
  return module.featureId ? (FEATURES.find((f) => f.id === module.featureId) ?? null) : null;
}
