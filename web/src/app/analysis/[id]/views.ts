// The report's sections, each opened from an infographic tile as a dialog (?view=…). Plain data, so the in-app
// assistant's knowledge base (lib/assistant/knowledge.ts) can list them without importing React components.

export const VIEWS = {
  scores: "Growth score",
  diagnosis: "What's holding the business back",
  plan: "Growth plan",
  technical: "Technical checks",
  answers: "What you told us",
  profile: "Business profile",
  content: "30-day content plan",
  drafts: "Drafted posts",
  opportunities: "Top 5 opportunities",
} as const;
export type ViewKey = keyof typeof VIEWS;

export function isView(v: unknown): v is ViewKey {
  return typeof v === "string" && v in VIEWS;
}
