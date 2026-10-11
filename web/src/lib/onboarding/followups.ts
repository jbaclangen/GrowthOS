import { z } from "zod";
import { getPainPoint } from "./catalog";

// Adaptive follow-up questions (ON-5, D-028). The question bank is typed code like the catalog: only stable
// keys are stored in onboarding_follow_ups. Pure logic only (no I/O), so it is unit-tested.
//
// Rules:
// - Keys are stable: never rename or reuse one, and never change what a choice value means.
// - Questions ask about the owner's own business. They never promise a result or imply Braventa will do the work.

export type Choice = { value: string; label: string };
export type Question = {
  key: string;
  text: string;
  // Shown under the question so the owner knows why it is asked (spec §5.5).
  why: string;
} & ({ type: "choice"; choices: Choice[] } | { type: "text"; placeholder: string });

const choice = (key: string, text: string, why: string, choices: [string, string][]): Question => ({
  key,
  text,
  why,
  type: "choice",
  choices: choices.map(([value, label]) => ({ value, label })),
});
const text = (key: string, q: string, why: string, placeholder: string): Question => ({
  key,
  text: q,
  why,
  type: "text",
  placeholder,
});

// Asked about any pain point, in this default order of usefulness.
const GENERIC: Question[] = [
  choice("severity", "How much is this holding the business back?", "So the plan tackles the biggest problems first.", [
    ["minor", "A little"],
    ["noticeable", "Noticeably"],
    ["serious", "Seriously"],
    ["biggest", "It's our biggest problem"],
  ]),
  text("current_process", "How do you handle this today?", "So the plan builds on what you already do.", "For example: I reply to messages in the evening when I have time"),
  text("desired_outcome", "What would a good result look like three months from now?", "So the plan aims at the result you want.", "For example: 10 qualified inquiries a month"),
  text("evidence", "Do you have a number or a recent example?", "Real numbers make the plan more specific.", "For example: about 5 inquiries a month, mostly from referrals"),
  choice("urgency", "How soon does this need attention?", "So the 30-day plan starts with what can't wait.", [
    ["this_month", "This month"],
    ["quarter", "In the next 3 months"],
    ["year", "This year"],
    ["no_rush", "No rush"],
  ]),
  choice("constraints", "What's the biggest limit on fixing it?", "So the first steps fit what you can actually do.", [
    ["budget", "Budget"],
    ["time", "Time"],
    ["staff", "Staff"],
    ["know_how", "Know-how"],
    ["none", "Nothing major"],
  ]),
  choice("impact", "What does it cost the business most?", "So the plan measures the right thing.", [
    ["revenue", "Sales or revenue"],
    ["leads", "Leads"],
    ["time", "Time"],
    ["money", "Money spent"],
    ["customers", "Customer experience"],
  ]),
  choice("frequency", "How often does it happen?", "So the plan can tell a constant problem from an occasional one.", [
    ["daily", "Every day"],
    ["weekly", "Every week"],
    ["monthly", "Every month or so"],
    ["occasionally", "Now and then"],
  ]),
  text("tools", "Which tools or apps are involved?", "So recommendations use tools you already have.", "For example: Facebook Messenger, a spreadsheet, Gmail"),
];

// Asked only about one pain point; these come before the generic questions.
const SPECIFIC: Record<string, Question[]> = {
  "leads.too_few": [
    text("lead_sources", "Where do most of your inquiries come from today?", "So the plan grows what already works.", "For example: referrals, Facebook, Google"),
  ],
  "leads.slow_follow_up": [
    choice("reply_speed", "How quickly do you usually reply to a new inquiry?", "Reply speed often decides who wins the job.", [
      ["hour", "Within an hour"],
      ["same_day", "The same day"],
      ["days", "Within a few days"],
      ["varies", "It varies a lot"],
    ]),
  ],
  "leads.low_conversion": [
    choice("close_rate", "Roughly how many of your quotes or inquiries become customers?", "So the plan knows where leads are lost.", [
      ["most", "Most of them"],
      ["half", "About half"],
      ["few", "A few"],
      ["unknown", "Not sure"],
    ]),
  ],
  "content.inconsistent": [
    choice("posting_now", "How often do you post now?", "So the content plan is realistic for you.", [
      ["weekly", "Every week"],
      ["monthly", "A few times a month"],
      ["rarely", "Rarely"],
      ["never", "Not at all"],
    ]),
  ],
  "website.search_visibility": [
    text("search_terms", "What would someone type into Google to find a business like yours?", "So the plan targets the searches your customers make.", "For example: electrician near Baguio"),
  ],
  "website.low_conversion": [
    choice("first_action", "What should a website visitor do first?", "So the website points visitors to one clear next step.", [
      ["call", "Call us"],
      ["form", "Fill in a form"],
      ["book", "Book online"],
      ["message", "Send a message"],
    ]),
  ],
  "retention.few_repeat": [
    choice("repeat_cycle", "How often could a customer need you again?", "So follow-up is timed to when customers need you.", [
      ["monthly", "Every month"],
      ["yearly", "Every year or so"],
      ["rarely", "Every few years"],
      ["once", "Usually only once"],
    ]),
  ],
  "capacity.no_time": [
    choice("hours_available", "How many hours a week can someone spend on marketing?", "So the plan fits the time you have.", [
      ["under_1", "Under an hour"],
      ["1_3", "1–3 hours"],
      ["3_5", "3–5 hours"],
      ["over_5", "More than 5 hours"],
    ]),
  ],
};

// Total questions per session and the size of each round (spec: "about 4", 1–3 at a time).
export const ROUND_SIZES = [2, 2] as const;
export const MAX_FOLLOW_UPS = ROUND_SIZES.reduce((a, b) => a + b, 0);
export const MAX_ANSWER = 500;
export const NOT_APPLICABLE = "__not_applicable";

export function questionsFor(painPointId: string): Question[] {
  return [...(SPECIFIC[painPointId] ?? []), ...GENERIC];
}

export function getQuestion(painPointId: string, key: string) {
  return questionsFor(painPointId).find((q) => q.key === key);
}

// The answer as the owner would read it: a choice's label, or their own words.
export function answerLabel(painPointId: string, key: string, answer: string) {
  const q = getQuestion(painPointId, key);
  return q?.type === "choice" ? (q.choices.find((c) => c.value === answer)?.label ?? answer) : answer;
}

export type Candidate = { id: string; painPointId: string; key: string; priority: number };
export const candidateId = (painPointId: string, key: string) => `${painPointId}::${key}`;

// Questions that may still be asked: about the owner's top priorities only, never one already asked
// (answered, skipped or not applicable), and never one the owner already answered elsewhere.
export function candidateQuestions(input: {
  priorities: string[];
  asked: { painPointId: string; key: string }[];
  knownTools: boolean;
}): Candidate[] {
  const asked = new Set(input.asked.map((a) => candidateId(a.painPointId, a.key)));
  return input.priorities.flatMap((painPointId, i) => {
    if (!getPainPoint(painPointId)) return [];
    return questionsFor(painPointId)
      .filter((q) => !(q.key === "tools" && input.knownTools))
      .filter((q) => !asked.has(candidateId(painPointId, q.key)))
      .map((q) => ({ id: candidateId(painPointId, q.key), painPointId, key: q.key, priority: i + 1 }));
  });
}

// How many questions the next round may ask; 0 means follow-ups are finished.
export function nextRoundSize(roundsDone: number, askedCount: number) {
  if (roundsDone >= ROUND_SIZES.length) return 0;
  return Math.max(0, Math.min(ROUND_SIZES[roundsDone], MAX_FOLLOW_UPS - askedCount));
}

// Used when the model is unavailable: the most useful unasked question for each priority in turn.
export function fallbackSelection(candidates: Candidate[], size: number): Candidate[] {
  const byPriority = new Map<number, Candidate[]>();
  for (const c of candidates) byPriority.set(c.priority, [...(byPriority.get(c.priority) ?? []), c]);
  const queues = [...byPriority.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => [...list]);
  const out: Candidate[] = [];
  while (out.length < size && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && out.length < size) out.push(next);
    }
  }
  return out;
}

// What the economical model returns when choosing the next questions.
export const selectionSchema = z.object({
  questions: z.array(z.object({ id: z.string() })).default([]),
  enough: z.boolean().default(false),
});

// Keep only offered candidates, without duplicates, up to the round size. An empty choice before the first
// round falls back to the default order, so the owner is always asked something useful at least once.
export function sanitizeSelection(value: unknown, candidates: Candidate[], size: number, firstRound: boolean) {
  const parsed = selectionSchema.parse(value);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const out: Candidate[] = [];
  for (const q of parsed.questions) {
    const c = byId.get(q.id);
    if (!c || out.includes(c)) continue;
    out.push(c);
    if (out.length === size) break;
  }
  if (!out.length && firstRound) return fallbackSelection(candidates, size);
  return out;
}

export type Pending = { id: string; painPointId: string; key: string };
export type FollowUpUpdate = { id: string; status: "answered" | "skipped" | "not_applicable"; answer: string | null };

// The answers to one round. A blank answer means skipped; nothing is required.
export function parseFollowUpForm(formData: FormData, pending: Pending[]): { data: FollowUpUpdate[] } | { error: string } {
  return validateFollowUps(
    pending.map((p) => ({
      id: p.id,
      answer: String(formData.get(`answer:${p.id}`) ?? ""),
      notApplicable: Boolean(formData.get(`na:${p.id}`)),
    })),
    pending,
  );
}

export type RawAnswer = { id: string; answer?: string | null; notApplicable?: boolean };

// Shared by the form and the AI assistant connection (MCP). Every pending question gets a status; a question
// without an answer is skipped. Answers for questions that aren't pending are ignored.
export function validateFollowUps(answers: RawAnswer[], pending: Pending[]): { data: FollowUpUpdate[] } | { error: string } {
  const byId = new Map(answers.map((a) => [a.id, a]));
  const out: FollowUpUpdate[] = [];
  for (const p of pending) {
    const q = getQuestion(p.painPointId, p.key);
    const given = byId.get(p.id);
    const raw = String(given?.answer ?? "").trim();
    if (raw === NOT_APPLICABLE || given?.notApplicable) {
      out.push({ id: p.id, status: "not_applicable", answer: null });
    } else if (!raw || !q) {
      out.push({ id: p.id, status: "skipped", answer: null });
    } else if (q.type === "choice" && !q.choices.some((c) => c.value === raw)) {
      return { error: "One of the answers isn't one of the options offered. Choose one of the listed options." };
    } else if (raw.length > MAX_ANSWER) {
      return { error: `Keep each answer under ${MAX_ANSWER} characters.` };
    } else {
      out.push({ id: p.id, status: "answered", answer: raw });
    }
  }
  return { data: out };
}
