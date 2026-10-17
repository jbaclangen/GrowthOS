import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyStatement } from "./classify";
import { addNextRound } from "./next-questions";
import { startPlanIfReady } from "./orchestrate";
import type { Discovery, Review } from "./discovery";
import type { FollowUpUpdate } from "./followups";
import { handOff } from "@/lib/pipeline/handoff";
import { firstStep } from "@/lib/pipeline/steps";

// The onboarding steps (ON-2 to ON-6), shared by the web forms (app/onboarding/[sessionId]/actions.ts) and the AI
// assistant connection (lib/mcp, D-036). Callers pass the database client:
// - the web forms pass the signed-in user's client, so RLS limits every read and write to their organization;
// - the MCP route passes the service client, so it must load the session with loadSession(db, id, orgId), which
//   scopes it to the organization of the access key it has already checked. Every query below is by session id.

export type Session = { id: string; organization_id: string; business_profile_id: string; status: string };
export type StepResult = { error: string } | { ok: true };

export async function loadSession(db: SupabaseClient, sessionId: string, organizationId?: string): Promise<Session | null> {
  let query = db
    .from("onboarding_sessions")
    .select("id, organization_id, business_profile_id, status")
    .eq("id", sessionId);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query.maybeSingle();
  return (data as Session | null) ?? null;
}

// When discovery is finished (or skipped) and the website evidence is in, build the plan. Its first step runs in
// its own invocation, not in this request's (which may already have spent minutes on follow-up question calls).
function startPlanAfterResponse(sessionId: string) {
  after(async () => {
    try {
      const plan = await startPlanIfReady(sessionId);
      if (plan) await handOff(plan, firstStep(plan.worker));
    } catch (e) {
      console.error(`starting the plan for onboarding session ${sessionId} failed`, e);
    }
  });
}

export async function completeSession(db: SupabaseClient, session: Session) {
  await db
    .from("onboarding_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", session.id);
  startPlanAfterResponse(session.id);
}

export async function skipDiscovery(db: SupabaseClient, session: Session) {
  await db
    .from("onboarding_sessions")
    .update({ status: "skipped", completed_at: new Date().toISOString() })
    .eq("id", session.id);
  startPlanAfterResponse(session.id);
}

// Saves the owner's chosen pain points and own words, and the AI's suggested matches for their words.
export async function saveDiscovery(db: SupabaseClient, session: Session, discovery: Discovery): Promise<StepResult> {
  const { painPointIds, statement } = discovery;
  const base = { organization_id: session.organization_id, session_id: session.id };
  const rows: Record<string, unknown>[] = painPointIds.map((id) => ({
    ...base,
    kind: "pain_point",
    pain_point_id: id,
    source: "owner_selected",
    confirmed: true,
  }));

  if (statement) {
    rows.push({ ...base, kind: "statement", source: "owner_selected", confirmed: true, original_text: statement });
    // Map the owner's words to catalog pain points; the owner confirms them on the next step.
    // If the AI call fails the statement is still saved and used, so the owner is never blocked.
    let matches: Awaited<ReturnType<typeof classifyStatement>> = [];
    try {
      matches = await classifyStatement(session.organization_id, statement);
    } catch (e) {
      console.error("classifying the discovery statement failed", e);
    }
    for (const m of matches) {
      if (painPointIds.includes(m.painPointId)) continue;
      rows.push({
        ...base,
        kind: "pain_point",
        pain_point_id: m.painPointId,
        source: "ai_suggested",
        confirmed: false,
        ai_confidence: m.confidence,
        original_text: m.quote || statement.slice(0, 200),
      });
    }
  }

  // Going back and changing answers replaces the earlier ones for this session, follow-ups included.
  await db.from("onboarding_follow_ups").delete().eq("session_id", session.id);
  const { error: deleteError } = await db.from("onboarding_responses").delete().eq("session_id", session.id);
  const { error: insertError } = deleteError ? { error: deleteError } : await db.from("onboarding_responses").insert(rows);
  if (insertError) return { error: "Your answers weren't saved. Try again." };

  await db.from("onboarding_sessions").update({ status: "reviewing" }).eq("id", session.id);
  return { ok: true };
}

// The pain points the owner can keep on the review step: their own picks and the AI's suggestions.
export async function reviewCandidates(db: SupabaseClient, session: Session) {
  const { data } = await db
    .from("onboarding_responses")
    .select("id, pain_point_id, source, ai_confidence, original_text")
    .eq("session_id", session.id)
    .eq("kind", "pain_point");
  return (data ?? []) as {
    id: string;
    pain_point_id: string;
    source: string;
    ai_confidence: string | null;
    original_text: string | null;
  }[];
}

export async function saveReview(
  db: SupabaseClient,
  session: Session,
  candidates: { id: string; pain_point_id: string }[],
  review: Review,
): Promise<StepResult> {
  const { confirmedIds, priorities } = review;

  // (session_id, customer_priority) is unique, so clear old priorities before setting new ones.
  const { error: clearError } = await db.from("onboarding_responses").update({ customer_priority: null }).eq("session_id", session.id);
  if (clearError) return { error: "Your priorities weren't saved. Try again." };

  for (const c of candidates) {
    const rank = priorities.indexOf(c.pain_point_id) + 1;
    const { error } = await db
      .from("onboarding_responses")
      .update({ confirmed: confirmedIds.includes(c.pain_point_id), customer_priority: rank || null })
      .eq("id", c.id);
    if (error) return { error: "Your priorities weren't saved. Try again." };
  }

  // Changed priorities: drop unanswered questions and those about issues that are no longer a priority.
  // Answers about the remaining priorities are kept, so nothing is asked twice.
  await db.from("onboarding_follow_ups").delete().eq("session_id", session.id).eq("status", "pending");
  await db
    .from("onboarding_follow_ups")
    .delete()
    .eq("session_id", session.id)
    .not("pain_point_id", "in", `(${priorities.map((p) => `"${p}"`).join(",")})`);

  await db.from("onboarding_sessions").update({ status: "following_up" }).eq("id", session.id);
  return { ok: true };
}

// Asks the next round of follow-up questions, or finishes onboarding when there is nothing worth asking.
// A failure here never blocks the owner: the plan is built from what they have already told us.
export async function continueFollowUps(db: SupabaseClient, session: Session): Promise<"questions" | "completed"> {
  let added = 0;
  try {
    added = await addNextRound(db, session);
  } catch (e) {
    console.error("adding follow-up questions failed", e);
  }
  if (added) return "questions";
  await completeSession(db, session);
  return "completed";
}

export async function pendingFollowUps(db: SupabaseClient, session: Session) {
  const { data } = await db
    .from("onboarding_follow_ups")
    .select("id, pain_point_id, question_key, round")
    .eq("session_id", session.id)
    .eq("status", "pending");
  return (data ?? []) as { id: string; pain_point_id: string; question_key: string; round: number }[];
}

export async function saveFollowUps(db: SupabaseClient, updates: FollowUpUpdate[]): Promise<StepResult> {
  const now = new Date().toISOString();
  for (const u of updates) {
    const { error } = await db
      .from("onboarding_follow_ups")
      .update({ status: u.status, answer: u.answer, answered_at: now })
      .eq("id", u.id);
    if (error) return { error: "Your answers weren't saved. Try again." };
  }
  return { ok: true };
}

// "Skip the rest": unanswered questions are marked skipped and the plan starts.
export async function skipRemainingFollowUps(db: SupabaseClient, session: Session) {
  await db
    .from("onboarding_follow_ups")
    .update({ status: "skipped", answered_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("status", "pending");
  await completeSession(db, session);
}
