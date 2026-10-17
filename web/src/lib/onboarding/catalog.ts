// Pain-point and solution catalog for AI-assisted onboarding (ON-1, D-028).
// Source: docs/product/Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md §3 and §6.
//
// Rules:
// - IDs are stable: never rename or reuse one. Retire an entry with status "deprecated" instead of deleting it,
//   because stored onboarding_responses refer to it. Bump CATALOG_VERSION when entries change.
// - Solution availability must match what the product actually does today (CLAUDE.md: never present
//   planned features as live). Update it when a capability ships.

export const CATALOG_VERSION = 2;

export type Availability = "available" | "planned" | "manual";

export const SOLUTIONS = {
  growth_plan: {
    label: "Prioritized growth plan",
    availability: "available",
    description: "Braventa ranks what to fix first from your answers and your website.",
  },
  website_assessment: {
    label: "Website review",
    availability: "available",
    description: "Braventa reviews your public website pages and Google PageSpeed scores.",
  },
  content_studio: {
    label: "Content plan and drafts",
    availability: "available",
    description: "Braventa plans 30 days of content and drafts posts for your approval.",
  },
  crm_intelligence: {
    label: "CRM review",
    availability: "planned",
    description: "Reviewing your CRM data (HubSpot first) is planned, not available yet.",
  },
  automation: {
    label: "Workflow automation",
    availability: "planned",
    description: "Running automated workflows is planned, not available yet.",
  },
  analytics: {
    label: "Performance reporting",
    availability: "planned",
    description: "Reporting from connected analytics is planned, not available yet.",
  },
  ai_assistant: {
    label: "Business assistant",
    availability: "available",
    description: "Ask Braventa, in the app header, answers questions about how Braventa works and your latest report. It can't make changes.",
  },
  lifecycle_campaigns: {
    label: "Customer follow-up and retention",
    availability: "manual",
    description: "Braventa recommends what to do; you carry it out with your own tools.",
  },
  kpi_framework: {
    label: "Goals and KPIs",
    availability: "manual",
    description: "Braventa recommends goals and measures; you track them with your own tools.",
  },
  process_documentation: {
    label: "Process documentation",
    availability: "manual",
    description: "Braventa recommends which processes to document; you write them up.",
  },
} as const satisfies Record<string, { label: string; availability: Availability; description: string }>;

export type SolutionId = keyof typeof SOLUTIONS;

export const CATEGORIES = [
  { id: "leads_sales", label: "Leads and sales" },
  { id: "marketing_strategy", label: "Marketing strategy" },
  { id: "content_social", label: "Content and social media" },
  { id: "website_presence", label: "Website and online presence" },
  { id: "crm_customers", label: "CRM and customer management" },
  { id: "automation", label: "Manual work and automation" },
  { id: "reporting", label: "Reporting and decision-making" },
  { id: "retention", label: "Customer retention" },
  { id: "operations", label: "Operations and team productivity" },
  { id: "capacity_ai", label: "Budget, capacity, and AI adoption" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type PainPoint = {
  id: string;
  categoryId: CategoryId;
  label: string;
  solutionIds: SolutionId[];
  status: "active" | "deprecated";
};

const p = (id: string, categoryId: CategoryId, label: string, solutionIds: SolutionId[]): PainPoint => ({
  id,
  categoryId,
  label,
  solutionIds,
  status: "active",
});

export const PAIN_POINTS: PainPoint[] = [
  p("leads.too_few", "leads_sales", "Not enough inquiries or qualified leads", ["growth_plan", "website_assessment", "content_studio"]),
  p("leads.poor_fit", "leads_sales", "Leads are a poor fit for the business", ["growth_plan", "content_studio"]),
  p("leads.referral_reliance", "leads_sales", "We rely too much on referrals or word of mouth", ["growth_plan", "content_studio"]),
  p("leads.slow_follow_up", "leads_sales", "Leads aren't contacted quickly or followed up consistently", ["crm_intelligence", "automation"]),
  p("leads.low_conversion", "leads_sales", "Too many inquiries or quotes don't turn into customers", ["growth_plan", "crm_intelligence"]),

  p("strategy.no_plan", "marketing_strategy", "No clear marketing plan or target audience", ["growth_plan"]),
  p("strategy.unclear_offer", "marketing_strategy", "Our positioning or what makes us different isn't clear", ["growth_plan", "website_assessment"]),
  p("strategy.unclear_priorities", "marketing_strategy", "We don't know what's working or what to prioritize", ["growth_plan", "analytics"]),
  p("strategy.budget_unmeasured", "marketing_strategy", "Marketing money is spent without clear measurement", ["kpi_framework", "analytics"]),

  p("content.no_ideas", "content_social", "It's hard to come up with content ideas", ["content_studio"]),
  p("content.inconsistent", "content_social", "We don't publish consistently", ["content_studio"]),
  p("content.too_slow", "content_social", "Creating content takes too much time", ["content_studio"]),
  p("content.low_engagement", "content_social", "Our content gets little engagement or business", ["content_studio", "analytics"]),
  p("content.voice_inconsistent", "content_social", "Our brand voice and messaging are inconsistent", ["content_studio"]),

  p("website.low_conversion", "website_presence", "Website visitors rarely become inquiries", ["website_assessment"]),
  p("website.unclear_offer", "website_presence", "Visitors don't quickly understand what we offer", ["website_assessment"]),
  p("website.outdated", "website_presence", "Our website looks outdated or doesn't build trust", ["website_assessment"]),
  p("website.search_visibility", "website_presence", "We're hard to find on Google", ["website_assessment"]),
  p("website.forms_disconnected", "website_presence", "Website forms aren't connected to our follow-up", ["automation", "crm_intelligence"]),

  p("crm.scattered_data", "crm_customers", "Customer information is spread across tools", ["crm_intelligence"]),
  p("crm.unclear_pipeline", "crm_customers", "Our sales pipeline is unclear", ["crm_intelligence"]),
  p("crm.messy_data", "crm_customers", "Our CRM data is incomplete, duplicated or out of date", ["crm_intelligence"]),
  p("crm.underused", "crm_customers", "We have a CRM but barely use it", ["crm_intelligence"]),

  p("automation.repetitive_tasks", "automation", "Repetitive admin tasks take up too much time", ["automation", "process_documentation"]),
  p("automation.manual_copying", "automation", "Information is copied by hand between apps", ["automation"]),
  p("automation.broken", "automation", "Our existing automations fail or are hard to fix", ["automation"]),
  p("automation.where_to_start", "automation", "We don't know which process to automate first", ["growth_plan", "automation"]),

  p("reporting.no_clear_picture", "reporting", "No clear picture of how the business is performing", ["kpi_framework", "analytics"]),
  p("reporting.scattered_metrics", "reporting", "Our numbers are spread across too many platforms", ["analytics"]),
  p("reporting.slow_reports", "reporting", "Reports take too long to put together", ["analytics", "automation"]),
  p("reporting.unclear_kpis", "reporting", "We don't have clear goals or KPIs", ["kpi_framework", "growth_plan"]),

  p("retention.few_repeat", "retention", "Too few customers come back or buy again", ["lifecycle_campaigns", "content_studio"]),
  p("retention.no_follow_up", "retention", "Follow-up after a sale is inconsistent", ["lifecycle_campaigns", "automation"]),
  p("retention.no_feedback", "retention", "We rarely collect customer feedback or reviews", ["lifecycle_campaigns", "website_assessment"]),
  p("retention.missed_upsell", "retention", "We miss chances to sell more to existing customers", ["lifecycle_campaigns", "crm_intelligence"]),

  p("operations.forgotten_tasks", "operations", "Tasks are scattered and things get forgotten", ["process_documentation", "automation"]),
  p("operations.no_standards", "operations", "Our processes aren't standardized or written down", ["process_documentation"]),
  p("operations.poor_coordination", "operations", "Marketing, sales and operations aren't coordinated", ["process_documentation", "growth_plan"]),

  p("capacity.no_team", "capacity_ai", "We can't afford a full marketing team", ["growth_plan", "content_studio"]),
  p("capacity.no_time", "capacity_ai", "There isn't enough time or staff to carry out plans", ["growth_plan", "content_studio", "automation"]),
  p("capacity.unused_tools", "capacity_ai", "We pay for tools we barely use", ["growth_plan"]),
  p("capacity.ai_where_to_start", "capacity_ai", "We want to use AI but don't know where to start", ["growth_plan", "ai_assistant"]),
  p("capacity.ai_concerns", "capacity_ai", "We're worried about AI accuracy, privacy or quality", ["growth_plan"]),
];

const BY_ID = new Map(PAIN_POINTS.map((pp) => [pp.id, pp]));

export function getPainPoint(id: string) {
  return BY_ID.get(id);
}

export function isActivePainPointId(id: string) {
  return BY_ID.get(id)?.status === "active";
}

export function painPointsInCategory(categoryId: CategoryId) {
  return PAIN_POINTS.filter((pp) => pp.categoryId === categoryId && pp.status === "active");
}

export function categoryLabel(categoryId: CategoryId) {
  return CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

// "id: label (category)" lines for prompts; the model may only answer with these IDs.
export function catalogForPrompt() {
  return PAIN_POINTS.filter((pp) => pp.status === "active")
    .map((pp) => `${pp.id}: ${pp.label} (${categoryLabel(pp.categoryId)})`)
    .join("\n");
}
