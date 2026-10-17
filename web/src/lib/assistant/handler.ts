import type { ChatMessage } from "@/lib/integrations/openrouter";
import { assistantAccess, checkAssistantLimits, limitWindows } from "./access";
import { buildAssistantMessages, parseAssistantRequest, type BusinessSummary } from "./prompt";

// The request flow behind POST /api/assistant (D-042), with every I/O step injected so it is unit-tested without a
// database or a model. Order: signed in → organization → plan → input → limits → context → model → saved.

export type AssistantOrg = { id: string; name: string; plan: string; trial_ends_at: string };

export type AssistantDeps = {
  getUserId: () => Promise<string | null>;
  getOrg: () => Promise<AssistantOrg | null>;
  countUsage: (orgId: string, userId: string, windows: { dayStart: string; minuteStart: string }) => Promise<{ orgLastDay: number; userLastMinute: number }>;
  loadSummary: (org: AssistantOrg, userId: string) => Promise<BusinessSummary>;
  ask: (orgId: string, messages: ChatMessage[]) => Promise<{ text: string; model: string; inputTokens: number; outputTokens: number; costUsd: number }>;
  save: (row: {
    organization_id: string;
    user_id: string;
    question: string;
    answer: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }) => Promise<void>;
  isBudgetError: (e: unknown) => boolean;
  logError: (message: string, e: unknown) => void;
  now?: Date;
};

export type AssistantResponse = { status: number; body: { answer?: string; error?: string; remainingToday?: number } };

export const MESSAGES = {
  signedOut: "Your session has ended. Sign in again to use the assistant.",
  noOrg: "Analyze a website first, so the assistant has a business to talk about.",
  unavailable: "The assistant isn't available right now. Try again in a few minutes; if it keeps happening, contact us at braventa.io/contact.",
  budget: "Your business has reached its monthly AI usage limit, so the assistant is paused until next month. Contact us at braventa.io/contact to raise the limit.",
  failed: "The assistant couldn't answer just now. Try again in a minute; if it keeps happening, contact us at braventa.io/contact.",
  empty: "The assistant didn't return an answer. Try asking again, in different words.",
} as const;

export async function handleAssistantRequest(body: unknown, deps: AssistantDeps): Promise<AssistantResponse> {
  const userId = await deps.getUserId();
  if (!userId) return { status: 401, body: { error: MESSAGES.signedOut } };

  const org = await deps.getOrg();
  if (!org) return { status: 403, body: { error: MESSAGES.noOrg } };
  const access = assistantAccess(org, deps.now);
  if (!access.allowed) return { status: 403, body: { error: access.reason } };

  const parsed = parseAssistantRequest(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };

  let counts;
  try {
    counts = await deps.countUsage(org.id, userId, limitWindows(deps.now));
  } catch (e) {
    // Fail closed: without the count there is no limit (assistant_messages must exist, see the migration).
    deps.logError("assistant usage count failed", e);
    return { status: 503, body: { error: MESSAGES.unavailable } };
  }
  const limit = checkAssistantLimits(counts);
  if (!limit.allowed) return { status: 429, body: { error: limit.reason } };

  let answer;
  try {
    const business = await deps.loadSummary(org, userId);
    answer = await deps.ask(org.id, buildAssistantMessages({ ...parsed.value, business }));
  } catch (e) {
    if (deps.isBudgetError(e)) return { status: 429, body: { error: MESSAGES.budget } };
    deps.logError("assistant answer failed", e);
    return { status: 502, body: { error: MESSAGES.failed } };
  }
  const text = answer.text.trim();
  if (!text) return { status: 502, body: { error: MESSAGES.empty } };

  try {
    await deps.save({
      organization_id: org.id,
      user_id: userId,
      question: parsed.value.question,
      answer: text,
      model: answer.model,
      input_tokens: answer.inputTokens,
      output_tokens: answer.outputTokens,
      cost_usd: answer.costUsd,
    });
  } catch (e) {
    // The user still gets the answer; the usage is in ai_usage either way.
    deps.logError("assistant message save failed", e);
  }
  return { status: 200, body: { answer: text, remainingToday: limit.remainingToday } };
}
