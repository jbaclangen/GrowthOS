import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Scope } from "@/lib/oauth/scopes";
import { CATEGORIES, getPainPoint, painPointsInCategory } from "@/lib/onboarding/catalog";
import { MAX_SELECTED, MAX_STATEMENT, validateDiscovery, validateReview } from "@/lib/onboarding/discovery";
import { MAX_ANSWER, getQuestion, validateFollowUps } from "@/lib/onboarding/followups";
import { isOpen } from "@/lib/onboarding/steps";
import * as onboarding from "@/lib/onboarding/service";
import { createOnboarding } from "@/lib/onboarding/start";
import { normalizeUrl } from "@/lib/integrations/crawler";
import { parseOwnerInputs, GOAL_OPTIONS, TOOL_OPTIONS, OTHER_GOAL } from "@/lib/owner-inputs";
import { loadReport } from "@/app/analysis/[id]/report-data";

// The AI assistant connection's tools (MCP, D-036): the owner's assistant (Claude Code, Claude Desktop) fills in
// onboarding from what it knows about the business. Each tool is a thin wrapper over lib/onboarding, the same code
// the web forms use, so both paths behave the same.
//
// Security: ctx.db is the service client. The route has already resolved ctx.organizationId from a valid key or token;
// every session and business is loaded scoped to it, and IDs from the assistant are never trusted otherwise.
// Text from the assistant is owner input: it goes into prompts the same way form answers do (as quoted data).

// userId is null for service keys (organization-level, no person attached); rows they create have no created_by.
export type ToolContext = { db: SupabaseClient; organizationId: string; userId: string | null; appUrl: string };

export class ToolError extends Error {}

type Tool = {
  name: string;
  // The OAuth scope (or service-key scope) a caller needs to see and call this tool (lib/oauth/scopes.ts).
  scope: Scope;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  args: z.ZodType;
  run: (ctx: ToolContext, args: never) => Promise<unknown>;
};

const sessionId = z.uuid("session_id must be the id returned by braventa_start_onboarding");
const sessionIdSchema = { type: "string", description: "The onboarding session id returned by braventa_start_onboarding." };

async function openSession(ctx: ToolContext, id: string) {
  const session = await onboarding.loadSession(ctx.db, id, ctx.organizationId);
  if (!session) throw new ToolError("That onboarding session wasn't found for this business.");
  return session;
}

const reportUrl = (ctx: ToolContext, businessProfileId: string) => `${ctx.appUrl}/analysis/${businessProfileId}`;

function painPointView(id: string) {
  const pp = getPainPoint(id);
  return { pain_point_id: id, label: pp?.label ?? id };
}

async function followUpQuestions(ctx: ToolContext, session: onboarding.Session) {
  const pending = await onboarding.pendingFollowUps(ctx.db, session);
  return pending.flatMap((p) => {
    const q = getQuestion(p.pain_point_id, p.question_key);
    if (!q) return [];
    return [
      {
        question_id: p.id,
        about: getPainPoint(p.pain_point_id)?.label ?? p.pain_point_id,
        question: q.text,
        why_we_ask: q.why,
        ...(q.type === "choice"
          ? { type: "choice", choices: q.choices.map((c) => ({ value: c.value, label: c.label })) }
          : { type: "text", example: q.placeholder, max_characters: MAX_ANSWER }),
      },
    ];
  });
}

function nextFromFollowUps(ctx: ToolContext, session: onboarding.Session, next: "questions" | "completed", questions: unknown[]) {
  return next === "questions"
    ? {
        status: "following_up",
        questions,
        next_step:
          "Answer these with the owner's real information using braventa_answer_follow_up_questions. Leave out any question you can't answer from what the owner has told you, or mark it not_applicable.",
      }
    : {
        status: "completed",
        next_step:
          "Discovery is done. Braventa is building the growth score, diagnosis and plan; this usually takes a few minutes. Check with braventa_get_status.",
        report_url: reportUrl(ctx, session.business_profile_id),
      };
}

// Builds owner inputs the way the start form submits them, so the same validation applies.
function ownerInputs(goal?: string, serviceArea?: string, tools?: string[]) {
  const form = new FormData();
  if (goal) {
    if ((GOAL_OPTIONS as readonly string[]).includes(goal)) form.set("goal", goal);
    else {
      form.set("goal", OTHER_GOAL);
      form.set("goalOther", goal);
    }
  }
  if (serviceArea) form.set("serviceArea", serviceArea);
  const known = (tools ?? []).filter((t) => (TOOL_OPTIONS as readonly string[]).includes(t));
  const other = (tools ?? []).filter((t) => !(TOOL_OPTIONS as readonly string[]).includes(t));
  for (const t of known) form.append("tools", t);
  if (other.length) form.set("toolsOther", other.join(", "));
  return parseOwnerInputs(form);
}

const startArgs = z.object({
  website: z.string().trim().min(3).max(300),
  business_name: z.string().trim().max(120).optional(),
  goal: z.string().trim().max(200).optional(),
  service_area: z.string().trim().max(200).optional(),
  tools: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
});

const discoveryArgs = z.object({
  session_id: sessionId,
  pain_point_ids: z.array(z.string()).max(MAX_SELECTED).default([]),
  statement: z.string().max(MAX_STATEMENT).optional(),
});

const priorityArgs = z.object({
  session_id: sessionId,
  keep_pain_point_ids: z.array(z.string()).min(1).max(20),
  priorities: z.array(z.string()).min(1).max(3),
});

const answerArgs = z.object({
  session_id: sessionId,
  answers: z
    .array(
      z.object({
        question_id: z.uuid(),
        answer: z.string().max(MAX_ANSWER).optional(),
        not_applicable: z.boolean().optional(),
      }),
    )
    .max(10)
    .default([]),
  finish: z.boolean().default(false),
});

export const TOOLS: Tool[] = [
  {
    name: "braventa_start_onboarding",
    scope: "onboarding",
    title: "Start Braventa onboarding",
    description:
      "Starts onboarding for the owner's business: Braventa begins reviewing the website (public pages and Google PageSpeed) and opens the discovery questions. Use only details the owner has given you. Returns a session_id for the other tools.",
    inputSchema: {
      type: "object",
      properties: {
        website: { type: "string", description: "The business website, e.g. example.com." },
        business_name: { type: "string", description: "Optional. Braventa detects it from the website if left out." },
        goal: {
          type: "string",
          description: `Optional main goal. One of: ${GOAL_OPTIONS.map((g) => `"${g}"`).join(", ")}, or the owner's own words (200 characters max).`,
        },
        service_area: { type: "string", description: "Optional. Where the business serves customers (200 characters max)." },
        tools: {
          type: "array",
          items: { type: "string" },
          description: `Optional. Tools the business uses, up to 15. Known names: ${TOOL_OPTIONS.join(", ")}; others are fine too.`,
        },
      },
      required: ["website"],
      additionalProperties: false,
    },
    args: startArgs,
    run: async (ctx, args: z.infer<typeof startArgs>) => {
      let websiteUrl: string;
      try {
        websiteUrl = normalizeUrl(args.website);
      } catch {
        throw new ToolError("That doesn't look like a website address.");
      }
      const owner = ownerInputs(args.goal, args.service_area, args.tools);
      if ("error" in owner) throw new ToolError(owner.error);
      const started = await createOnboarding(ctx.db, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        websiteUrl,
        businessName: args.business_name,
        owner: owner.data,
      });
      if ("error" in started) throw new ToolError(started.error);
      return {
        session_id: started.sessionId,
        status: "discovering",
        website: websiteUrl,
        next_step: "Call braventa_get_discovery_questions with this session_id.",
        report_url: reportUrl(ctx, started.businessProfileId),
      };
    },
  },
  {
    name: "braventa_get_discovery_questions",
    scope: "onboarding",
    title: "Get Braventa discovery questions",
    description:
      "Lists the common business problems the owner can pick from, grouped by area, plus a free-text question. Pick the ones the owner has actually described, and summarize their situation in their own words.",
    inputSchema: {
      type: "object",
      properties: { session_id: sessionIdSchema },
      required: ["session_id"],
      additionalProperties: false,
    },
    args: z.object({ session_id: sessionId }),
    run: async (ctx, args: { session_id: string }) => {
      const session = await openSession(ctx, args.session_id);
      return {
        session_id: session.id,
        status: session.status,
        question: "What's making it hardest for the business to grow right now?",
        how_to_answer: `Choose up to ${MAX_SELECTED} pain points by id, and/or write a short description in the owner's words (up to ${MAX_STATEMENT} characters). Only include problems the owner has told you about; don't guess. Then call braventa_submit_discovery.`,
        categories: CATEGORIES.map((c) => ({
          id: c.id,
          label: c.label,
          pain_points: painPointsInCategory(c.id).map((pp) => ({ id: pp.id, label: pp.label })),
        })),
      };
    },
  },
  {
    name: "braventa_submit_discovery",
    scope: "onboarding",
    title: "Submit Braventa discovery answers",
    description:
      "Saves the problems the owner chose and their description. Braventa matches the description to known problems and returns all candidates; confirm them and the top priorities with the owner, then call braventa_confirm_priorities. Submitting again replaces earlier answers for this session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: sessionIdSchema,
        pain_point_ids: { type: "array", items: { type: "string" }, description: `Up to ${MAX_SELECTED} ids from braventa_get_discovery_questions.` },
        statement: { type: "string", description: `Optional. The owner's description in their own words, up to ${MAX_STATEMENT} characters.` },
      },
      required: ["session_id"],
      additionalProperties: false,
    },
    args: discoveryArgs,
    run: async (ctx, args: z.infer<typeof discoveryArgs>) => {
      const session = await openSession(ctx, args.session_id);
      if (!isOpen(session.status)) throw new ToolError("Discovery for this session is already finished. Use braventa_get_status.");
      const parsed = validateDiscovery(args.pain_point_ids, args.statement ?? "");
      if ("error" in parsed) throw new ToolError(parsed.error);
      const ignored = args.pain_point_ids.filter((id) => !parsed.data.painPointIds.includes(id));
      const saved = await onboarding.saveDiscovery(ctx.db, session, parsed.data);
      if ("error" in saved) throw new ToolError(saved.error);
      const candidates = await onboarding.reviewCandidates(ctx.db, session);
      return {
        status: "reviewing",
        ...(ignored.length ? { ignored_unknown_ids: ignored } : {}),
        candidates: candidates.map((c) => ({
          ...painPointView(c.pain_point_id),
          source: c.source === "ai_suggested" ? "suggested from the owner's description" : "chosen",
          ...(c.ai_confidence ? { confidence: c.ai_confidence } : {}),
          ...(c.source === "ai_suggested" && c.original_text ? { owner_words: c.original_text } : {}),
        })),
        next_step:
          "Show these to the owner. Ask which to keep (drop wrong suggestions) and their top 1–3 priorities in order, then call braventa_confirm_priorities.",
      };
    },
  },
  {
    name: "braventa_confirm_priorities",
    scope: "onboarding",
    title: "Confirm the owner's priorities",
    description:
      "Saves which problems the owner keeps and their top 1–3 priorities in order. Braventa then asks a few follow-up questions about those priorities (returned here), or finishes discovery if it has enough.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: sessionIdSchema,
        keep_pain_point_ids: { type: "array", items: { type: "string" }, description: "The candidate ids the owner keeps." },
        priorities: { type: "array", items: { type: "string" }, description: "1–3 of the kept ids, most important first." },
      },
      required: ["session_id", "keep_pain_point_ids", "priorities"],
      additionalProperties: false,
    },
    args: priorityArgs,
    run: async (ctx, args: z.infer<typeof priorityArgs>) => {
      const session = await openSession(ctx, args.session_id);
      if (!isOpen(session.status)) throw new ToolError("Discovery for this session is already finished. Use braventa_get_status.");
      if (session.status === "discovering") throw new ToolError("Submit the discovery answers first with braventa_submit_discovery.");
      const candidates = await onboarding.reviewCandidates(ctx.db, session);
      const parsed = validateReview(args.keep_pain_point_ids, args.priorities, candidates.map((c) => c.pain_point_id));
      if ("error" in parsed) throw new ToolError(parsed.error);
      const saved = await onboarding.saveReview(ctx.db, session, candidates, parsed.data);
      if ("error" in saved) throw new ToolError(saved.error);
      const next = await onboarding.continueFollowUps(ctx.db, session);
      return nextFromFollowUps(ctx, session, next, next === "questions" ? await followUpQuestions(ctx, session) : []);
    },
  },
  {
    name: "braventa_get_follow_up_questions",
    scope: "onboarding",
    title: "Get Braventa follow-up questions",
    description: "Lists the follow-up questions waiting for an answer in this session.",
    inputSchema: {
      type: "object",
      properties: { session_id: sessionIdSchema },
      required: ["session_id"],
      additionalProperties: false,
    },
    args: z.object({ session_id: sessionId }),
    run: async (ctx, args: { session_id: string }) => {
      const session = await openSession(ctx, args.session_id);
      if (session.status !== "following_up") {
        return { status: session.status, questions: [], next_step: "There are no follow-up questions right now. Use braventa_get_status." };
      }
      return { status: session.status, questions: await followUpQuestions(ctx, session) };
    },
  },
  {
    name: "braventa_answer_follow_up_questions",
    scope: "onboarding",
    title: "Answer Braventa follow-up questions",
    description:
      "Saves answers to the pending follow-up questions. For choice questions send the choice value; for text questions the owner's real answer. Questions left out are skipped. Set finish to true to stop asking questions and start building the plan.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: sessionIdSchema,
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_id: { type: "string" },
              answer: { type: "string", description: `A choice value, or text up to ${MAX_ANSWER} characters.` },
              not_applicable: { type: "boolean", description: "True if the question doesn't apply to this business." },
            },
            required: ["question_id"],
            additionalProperties: false,
          },
        },
        finish: { type: "boolean", description: "True to skip any remaining questions and start the plan." },
      },
      required: ["session_id"],
      additionalProperties: false,
    },
    args: answerArgs,
    run: async (ctx, args: z.infer<typeof answerArgs>) => {
      const session = await openSession(ctx, args.session_id);
      if (session.status !== "following_up") throw new ToolError("There are no follow-up questions waiting. Use braventa_get_status.");
      const pending = await onboarding.pendingFollowUps(ctx.db, session);
      const parsed = validateFollowUps(
        args.answers.map((a) => ({ id: a.question_id, answer: a.answer, notApplicable: a.not_applicable })),
        pending.map((p) => ({ id: p.id, painPointId: p.pain_point_id, key: p.question_key })),
      );
      if ("error" in parsed) throw new ToolError(parsed.error);
      const saved = await onboarding.saveFollowUps(ctx.db, parsed.data);
      if ("error" in saved) throw new ToolError(saved.error);
      if (args.finish) {
        await onboarding.completeSession(ctx.db, session);
        return nextFromFollowUps(ctx, session, "completed", []);
      }
      const next = await onboarding.continueFollowUps(ctx.db, session);
      return nextFromFollowUps(ctx, session, next, next === "questions" ? await followUpQuestions(ctx, session) : []);
    },
  },
  {
    name: "braventa_get_status",
    scope: "onboarding",
    title: "Check Braventa onboarding status",
    description:
      "Shows where onboarding stands and, once the plan is ready, a short summary: growth score, the top priorities in the plan, and a link to the full report. The owner confirms or corrects the diagnosis and approves posts in Braventa itself.",
    inputSchema: {
      type: "object",
      properties: { session_id: { ...sessionIdSchema, description: "Optional. Defaults to the most recent session." } },
      additionalProperties: false,
    },
    args: z.object({ session_id: sessionId.optional() }),
    run: async (ctx, args: { session_id?: string }) => {
      let session: onboarding.Session | null;
      if (args.session_id) session = await openSession(ctx, args.session_id);
      else {
        const { data } = await ctx.db
          .from("onboarding_sessions")
          .select("id, organization_id, business_profile_id, status")
          .eq("organization_id", ctx.organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        session = (data as onboarding.Session | null) ?? null;
      }
      if (!session) return { status: "not_started", next_step: "Start with braventa_start_onboarding." };

      // The session is already scoped to the key's organization, so its business profile is too.
      const report = await loadReport(ctx.db, session.business_profile_id);
      if (!report || report.profile.organization_id !== ctx.organizationId) throw new ToolError("That business wasn't found.");
      const url = reportUrl(ctx, session.business_profile_id);
      const base = { session_id: session.id, business: report.profile.company_name, report_url: url };

      if (isOpen(session.status)) {
        const step =
          session.status === "discovering"
            ? "Discovery questions are waiting: braventa_get_discovery_questions."
            : session.status === "reviewing"
              ? "The owner's priorities need confirming: braventa_confirm_priorities."
              : "Follow-up questions are waiting: braventa_get_follow_up_questions.";
        return { ...base, status: session.status, next_step: step };
      }
      if (report.job?.status === "failed") {
        return { ...base, status: "failed", next_step: "The analysis didn't finish. The owner can run it again from the report page." };
      }
      if (report.running || !report.diagnosis) {
        return { ...base, status: "building_plan", next_step: "Braventa is building the plan. Check again in a minute or two." };
      }
      const top = [...report.planItems]
        .filter((i) => i.status !== "dismissed")
        .sort((a, b) => (a.final_priority ?? 99) - (b.final_priority ?? 99))
        .slice(0, 3)
        .map((i) => ({ title: i.title, first_step: i.first_action }));
      return {
        ...base,
        status: "ready",
        growth_score: report.data?.growth_score ?? null,
        growth_score_note:
          "0–100. Combines Braventa's review of the website (content clarity, conversion readiness, online presence) with Google PageSpeed results. It isn't a measure of the whole business and doesn't predict results.",
        top_priorities: top,
        diagnosis_status: report.diagnosis.status,
        next_step: "Ask the owner to open the report to confirm or correct the diagnosis and review the drafted posts.",
      };
    },
  },
];

export function findTool(name: string) {
  return TOOLS.find((t) => t.name === name);
}
