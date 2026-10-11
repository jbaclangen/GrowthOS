import { z } from "zod";
import { isActivePainPointId } from "./catalog";

// Pure parsing and validation for onboarding discovery (ON-2, ON-3). No I/O, so it is unit-tested.

export const MAX_STATEMENT = 1000;
export const MAX_SELECTED = 12;
export const MAX_AI_MATCHES = 5;

export type Discovery = { painPointIds: string[]; statement: string | null };

export function parseDiscoveryForm(formData: FormData): { data: Discovery } | { error: string } {
  return validateDiscovery(formData.getAll("painPoints").map(String), String(formData.get("statement") ?? ""));
}

// Shared by the form and the AI assistant connection (MCP): unknown IDs are dropped, as in the form.
export function validateDiscovery(ids: string[], rawStatement: string): { data: Discovery } | { error: string } {
  const painPointIds = [...new Set(ids)].filter(isActivePainPointId);
  if (painPointIds.length > MAX_SELECTED) return { error: `Choose up to ${MAX_SELECTED} issues` };

  const statement = rawStatement.trim();
  if (statement.length > MAX_STATEMENT) return { error: `Keep your description under ${MAX_STATEMENT} characters` };

  if (!painPointIds.length && !statement) {
    return { error: "Choose at least one issue or describe it in your own words. You can also skip this step." };
  }
  return { data: { painPointIds, statement: statement || null } };
}

// What the economical model returns when mapping the owner's own words to catalog IDs.
export const classificationSchema = z.object({
  matches: z
    .array(
      z.object({
        pain_point_id: z.string(),
        confidence: z.preprocess((v) => String(v).toLowerCase(), z.enum(["high", "medium", "low"])),
        quote: z.string().default(""),
      }),
    )
    .default([]),
});

export type Match = { painPointId: string; confidence: "high" | "medium" | "low"; quote: string };

// Drop IDs that aren't in the catalog (the model may invent some), duplicates, and anything past the cap.
export function sanitizeMatches(value: unknown): Match[] {
  const parsed = classificationSchema.parse(value);
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const m of parsed.matches) {
    if (!isActivePainPointId(m.pain_point_id) || seen.has(m.pain_point_id)) continue;
    seen.add(m.pain_point_id);
    out.push({ painPointId: m.pain_point_id, confidence: m.confidence, quote: m.quote.trim().slice(0, 200) });
    if (out.length === MAX_AI_MATCHES) break;
  }
  return out;
}

export type Review = { confirmedIds: string[]; priorities: string[] };

// The review step: which candidates the owner keeps, and their top three in order.
export function parseReviewForm(formData: FormData, candidateIds: string[]): { data: Review } | { error: string } {
  return validateReview(
    formData.getAll("confirm").map(String),
    ["priority1", "priority2", "priority3"].map((key) => String(formData.get(key) ?? "")),
    candidateIds,
  );
}

// Shared by the form and the AI assistant connection (MCP). Priorities are in order; blanks are ignored.
export function validateReview(keep: string[], ranked: string[], candidateIds: string[]): { data: Review } | { error: string } {
  const candidates = new Set(candidateIds);
  const confirmedIds = [...new Set(keep)].filter((id) => candidates.has(id));
  if (!confirmedIds.length) {
    return { error: "Keep at least one issue, or go back and describe what's holding the business back." };
  }
  if (ranked.filter(Boolean).length > 3) return { error: "Choose up to three priorities." };

  const priorities: string[] = [];
  for (const id of ranked) {
    if (!id) continue;
    if (!confirmedIds.includes(id)) return { error: "Choose priorities from the issues you kept." };
    if (priorities.includes(id)) return { error: "Choose a different issue for each priority." };
    priorities.push(id);
  }
  if (!priorities.length) return { error: "Choose your first priority." };
  return { data: { confirmedIds, priorities } };
}
