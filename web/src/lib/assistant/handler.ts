import type { ChatMessage } from "@/lib/integrations/openrouter";
import { ASSISTANT_LIMITS, assistantAccess, checkAssistantLimits } from "./access";
import { buildAssistantMessages, parseAssistantRequest, type BusinessSummary } from "./prompt";

// The request flow behind POST /api/assistant (D-042), with every I/O step injected so it is unit-tested without a
// database or a model. Order: signed in → organization → plan → input → reserve a slot under the limits → context →
// model → mark the slot answered or failed. The slot is reserved BEFORE the model is called, in one atomic database
// step, so parallel requests can't all pass the limit check; a question that fails afterwards still counts.

export type AssistantOrg = { id: string; name: string; plan: string; trial_ends_at: string };

export type Reservation = { usageId: number | null; orgLastDay: number; userLastMinute: number };

export type AssistantDeps = {
  // Both throw when the lookup itself fails (as opposed to "signed out" or "no organization", which return null).
  getUserId: () => Promise<string | null>;
  getOrg: () => Promise<AssistantOrg | null>;
  // Counts the two windows and, when both are under the limits, records the question; usageId is null otherwise.
  reserve: (orgId: string, userId: string, limits: typeof ASSISTANT_LIMITS) => Promise<Reservation>;
  finish: (orgId: string, usageId: number, status: "answered" | "failed") => Promise<void>;
  loadSummary: (org: AssistantOrg, userId: string) => Promise<BusinessSummary>;
  ask: (orgId: string, messages: ChatMessage[]) => Promise<{ text: string }>;
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
  let userId: string | null;
  let org: AssistantOrg | null;
  try {
    userId = await deps.getUserId();
    if (!userId) return { status: 401, body: { error: MESSAGES.signedOut } };
    org = await deps.getOrg();
  } catch (e) {
    // A failed lookup isn't "signed out" or "no business": say it's temporary instead of sending them the wrong way.
    deps.logError("assistant account lookup failed", e);
    return { status: 503, body: { error: MESSAGES.unavailable } };
  }
  if (!org) return { status: 403, body: { error: MESSAGES.noOrg } };
  const access = assistantAccess(org, deps.now);
  if (!access.allowed) return { status: 403, body: { error: access.reason } };

  const parsed = parseAssistantRequest(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };

  let reservation: Reservation;
  try {
    reservation = await deps.reserve(org.id, userId, ASSISTANT_LIMITS);
  } catch (e) {
    // Fail closed: without a reservation there is no limit (assistant_usage must exist, see the migration).
    deps.logError("assistant usage reservation failed", e);
    return { status: 503, body: { error: MESSAGES.unavailable } };
  }
  const limit = checkAssistantLimits(reservation);
  if (!limit.allowed) return { status: 429, body: { error: limit.reason } };
  const usageId = reservation.usageId;
  if (usageId === null) {
    // The database refused although the counts look under the limits: never call the model without a reservation.
    deps.logError("assistant usage reservation refused", new Error("no usage id under the limits"));
    return { status: 503, body: { error: MESSAGES.unavailable } };
  }

  const settle = async (status: "answered" | "failed") => {
    try {
      await deps.finish(org.id, usageId, status);
    } catch (e) {
      // The reserved row already counts toward the limits; only its status is stale.
      deps.logError("assistant usage update failed", e);
    }
  };

  let answer;
  try {
    const business = await deps.loadSummary(org, userId);
    answer = await deps.ask(org.id, buildAssistantMessages({ ...parsed.value, business }));
  } catch (e) {
    await settle("failed");
    if (deps.isBudgetError(e)) return { status: 429, body: { error: MESSAGES.budget } };
    deps.logError("assistant answer failed", e);
    return { status: 502, body: { error: MESSAGES.failed } };
  }
  const text = answer.text.trim();
  if (!text) {
    await settle("failed");
    return { status: 502, body: { error: MESSAGES.empty } };
  }
  await settle("answered");
  return { status: 200, body: { answer: text, remainingToday: limit.remainingToday } };
}
