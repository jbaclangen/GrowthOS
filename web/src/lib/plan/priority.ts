import { SOLUTIONS, getPainPoint, type SolutionId } from "@/lib/onboarding/catalog";

// The single growth plan (ON-8, D-028): turning the model's diagnosis into stored findings and plan items, and
// the priority maths. Pure logic only (no I/O), so it is unit-tested. The spec's rule applies: the calculated
// score is a decision aid; it never overrides the owner's own priorities.

export type Level = "high" | "medium" | "low";
export type Provenance = "verified" | "customer_provided" | "inferred";
export type Source = "owner" | "website" | "pagespeed" | "inference";

// The spec's evidence types mapped onto Braventa's provenance classes (D-028).
export const PROVENANCE: Record<Source, Provenance> = {
  owner: "customer_provided",
  website: "verified",
  pagespeed: "verified",
  inference: "inferred",
};

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  verified: "Verified",
  customer_provided: "From you",
  inferred: "Inferred",
};

export const CONFIDENCE_SCORE: Record<Level, number> = { high: 5, medium: 3, low: 1 };

// The owner's answer to the "How soon does this need attention?" follow-up (ON-5) outranks the model's guess.
export const OWNER_URGENCY: Record<string, number> = { this_month: 5, quarter: 4, year: 2, no_rush: 1 };

export const MAX_FINDINGS = 6;
export const MAX_PLAN_ITEMS = 7;

const clamp = (v: number) => Math.min(5, Math.max(1, Math.round(v)));

// Priority score = (Impact × Urgency × Confidence) / Effort, each on 1–5 (spec §7). Range 0.2–125.
export function calculatedPriority(i: { impact: number; urgency: number; effort: number; confidence: Level }) {
  const raw = (clamp(i.impact) * clamp(i.urgency) * CONFIDENCE_SCORE[i.confidence]) / clamp(i.effort);
  return Math.round(raw * 10) / 10;
}

export function scoreExplanation(i: { impact: number; urgency: number; effort: number; confidence: Level }) {
  return `Impact ${i.impact} × urgency ${i.urgency} × confidence ${CONFIDENCE_SCORE[i.confidence]} ÷ effort ${i.effort}`;
}

export type RawFinding = {
  statement: string;
  evidence: string;
  source: Source;
  confidence: Level;
  pain_point_ids: string[];
};
export type RawItem = {
  title: string;
  area: string;
  pain_point_ids: string[];
  finding_refs: number[];
  why: string;
  first_action: string;
  dependencies: string;
  success_metric: string;
  solution_ids: string[];
  manual_alternative: string;
  impact: number;
  urgency: number;
  effort: number;
  confidence: Level;
};

export type Finding = {
  position: number;
  statement: string;
  evidence: string;
  provenance: Provenance;
  confidence: Level;
  pain_point_ids: string[];
};

export type PlanItem = Omit<RawItem, "finding_refs" | "solution_ids"> & {
  finding_positions: number[];
  solution_ids: SolutionId[];
  evidence: string;
  urgency_from_owner: boolean;
  customer_priority: number | null;
  ai_priority: number;
  calculated_priority: number;
};

export type DiscoveryFacts = {
  // Confirmed pain point → the owner's priority (1–3) or null.
  priorityOf: Map<string, number | null>;
  // Pain point → the owner's answer to the urgency follow-up, if any.
  urgencyOf: Map<string, string>;
};

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Keep only what the model may claim: confirmed pain points, catalog solutions, real finding references.
export function toFindings(raw: RawFinding[], facts: DiscoveryFacts): Finding[] {
  return raw.slice(0, MAX_FINDINGS).map((f, i) => ({
    position: i + 1,
    statement: cut(f.statement.trim(), 600),
    evidence: cut(f.evidence.trim(), 800),
    provenance: PROVENANCE[f.source],
    confidence: f.confidence,
    pain_point_ids: [...new Set(f.pain_point_ids)].filter((id) => facts.priorityOf.has(id)),
  }));
}

export function toPlanItems(raw: RawItem[], findings: Finding[], facts: DiscoveryFacts): PlanItem[] {
  return raw.slice(0, MAX_PLAN_ITEMS).map((r, i) => {
    const pain_point_ids = [...new Set(r.pain_point_ids)].filter((id) => facts.priorityOf.has(id));
    const finding_positions = [...new Set(r.finding_refs)].filter((n) => n >= 1 && n <= findings.length);
    const ranks = pain_point_ids.map((id) => facts.priorityOf.get(id)).filter((n): n is number => !!n);
    const ownerUrgencies = pain_point_ids
      .map((id) => OWNER_URGENCY[facts.urgencyOf.get(id) ?? ""])
      .filter((n): n is number => !!n);
    const urgency = ownerUrgencies.length ? Math.max(...ownerUrgencies) : clamp(r.urgency);
    const scored = { impact: clamp(r.impact), urgency, effort: clamp(r.effort), confidence: r.confidence };
    return {
      ...r,
      ...scored,
      title: cut(r.title.trim(), 300),
      pain_point_ids,
      finding_positions,
      solution_ids: [...new Set(r.solution_ids)].filter((id): id is SolutionId => id in SOLUTIONS),
      evidence: finding_positions.map((n) => findings[n - 1].evidence).join(" "),
      urgency_from_owner: ownerUrgencies.length > 0,
      customer_priority: ranks.length ? Math.min(...ranks) : null,
      ai_priority: i + 1,
      calculated_priority: calculatedPriority(scored),
    };
  });
}

// Plan order: the owner's priorities first (1, 2, 3), then the calculated score, then the model's ranking.
export function orderPlan<T extends { customer_priority: number | null; calculated_priority: number; ai_priority: number }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      (a.customer_priority ?? 99) - (b.customer_priority ?? 99) ||
      b.calculated_priority - a.calculated_priority ||
      a.ai_priority - b.ai_priority,
  );
}

// Final priorities when the owner confirms the plan: dismissed items get none.
export function finalPriorities<
  T extends { id: string; status: string; customer_priority: number | null; calculated_priority: number; ai_priority: number },
>(items: T[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  let rank = 0;
  for (const item of orderPlan(items)) out.set(item.id, item.status === "dismissed" ? null : ++rank);
  return out;
}

// What Braventa can do for an item today, in the owner's terms (CLAUDE.md: never present planned features as live).
export function capability(solutionIds: string[]) {
  const known = solutionIds.filter((id): id is SolutionId => id in SOLUTIONS).map((id) => SOLUTIONS[id]);
  const available = known.filter((s) => s.availability === "available");
  const notYet = known.filter((s) => s.availability !== "available");
  return { available, notYet };
}

export function painPointLabel(id: string) {
  return getPainPoint(id)?.label ?? id;
}
