import { z } from "zod";

// Guided onboarding answers (BI-12, D-021). Provenance: Customer-provided ("From you").
// Shared by the onboarding form, the edit form on the results page, the server actions and the prompts.

export const GOAL_OPTIONS = [
  "More leads and inquiries",
  "More booked appointments or jobs",
  "More repeat business and referrals",
  "Become better known in my area",
] as const;

export const TOOL_OPTIONS = [
  "HubSpot",
  "Another CRM",
  "Google Business Profile",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Email marketing tool",
  "WordPress",
] as const;

export const OTHER_GOAL = "other";

export type OwnerInputs = { goal: string | null; serviceArea: string | null; tools: string[] };

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => v || null)
    .nullable()
    .default(null);

const schema = z.object({
  goal: z.string().trim().default(""),
  goalOther: optionalText(200, "Keep your goal under 200 characters"),
  serviceArea: optionalText(200, "Keep the service area under 200 characters"),
  tools: z.array(z.string().trim().min(1).max(60)).default([]),
  toolsOther: optionalText(200, "Keep other tools under 200 characters"),
});

// Reads the guided questions from a submitted form. Every answer is optional.
export function parseOwnerInputs(formData: FormData): { data: OwnerInputs } | { error: string } {
  const parsed = schema.safeParse({
    goal: formData.get("goal") ?? "",
    goalOther: formData.get("goalOther") ?? "",
    serviceArea: formData.get("serviceArea") ?? "",
    tools: formData.getAll("tools").map(String),
    toolsOther: formData.get("toolsOther") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { goal, goalOther, serviceArea, tools, toolsOther } = parsed.data;
  const chosenGoal =
    goal === OTHER_GOAL ? goalOther : (GOAL_OPTIONS as readonly string[]).includes(goal) ? goal : null;

  const known = tools.filter((t) => (TOOL_OPTIONS as readonly string[]).includes(t));
  const extra = (toolsOther ?? "")
    .split(",")
    .map((t) => t.trim().slice(0, 60))
    .filter(Boolean);
  const allTools = [...new Set([...known, ...extra])];
  if (allTools.length > 15) return { error: "List up to 15 tools" };

  return { data: { goal: chosenGoal, serviceArea, tools: allTools } };
}

export function hasOwnerInputs(o: OwnerInputs) {
  return Boolean(o.goal || o.serviceArea || o.tools.length);
}

// Column mapping for business_profiles.
export function toProfileColumns(o: OwnerInputs) {
  return { goals: o.goal, service_area: o.serviceArea, current_tools: o.tools };
}

export function fromProfileRow(row: { goals: string | null; service_area: string | null; current_tools: string[] | null }): OwnerInputs {
  return { goal: row.goals, serviceArea: row.service_area, tools: row.current_tools ?? [] };
}
