"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classifyStatement } from "@/lib/onboarding/classify";
import { parseDiscoveryForm, parseReviewForm } from "@/lib/onboarding/discovery";
import { parseFollowUpForm } from "@/lib/onboarding/followups";
import { addNextRound } from "@/lib/onboarding/next-questions";
import { isOpen, onboardingPath } from "@/lib/onboarding/steps";
import { startPlanIfReady } from "@/lib/onboarding/orchestrate";
import { runAnalysisJob } from "@/lib/pipeline/website-intel";

export type FormState = { error?: string } | undefined;

// All reads and writes go through the signed-in user's client, so RLS limits them to the user's organization.
async function loadSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("id, organization_id, business_profile_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  return { supabase, session };
}

// When discovery is finished (or skipped) and the website evidence is in, build the plan.
function startPlanAfterResponse(sessionId: string) {
  after(async () => {
    const planJobId = await startPlanIfReady(sessionId);
    if (planJobId) await runAnalysisJob(planJobId);
  });
}

type Session = NonNullable<Awaited<ReturnType<typeof loadSession>>["session"]>;
type Db = Awaited<ReturnType<typeof loadSession>>["supabase"];

async function complete(supabase: Db, session: Session): Promise<never> {
  await supabase
    .from("onboarding_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", session.id);
  startPlanAfterResponse(session.id);
  redirect(`/analysis/${session.business_profile_id}`);
}

// Ask the next round of follow-up questions, or finish onboarding when there is nothing worth asking.
// A failure here never blocks the owner: the plan is built from what they have already told us.
async function continueFollowUps(supabase: Db, session: Session): Promise<never> {
  let added = 0;
  try {
    added = await addNextRound(supabase, session);
  } catch (e) {
    console.error("adding follow-up questions failed", e);
  }
  if (!added) return complete(supabase, session);
  redirect(`/onboarding/${session.id}/questions`);
}

export async function submitDiscovery(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseDiscoveryForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, session } = await loadSession(sessionId);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!isOpen(session.status)) redirect(onboardingPath(session));

  const { painPointIds, statement } = parsed.data;
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
    // Map the owner's words to catalog pain points; the owner confirms them on the next screen.
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
  await supabase.from("onboarding_follow_ups").delete().eq("session_id", session.id);
  const { error: deleteError } = await supabase.from("onboarding_responses").delete().eq("session_id", session.id);
  const { error: insertError } = deleteError
    ? { error: deleteError }
    : await supabase.from("onboarding_responses").insert(rows);
  if (insertError) return { error: "Your answers weren't saved. Try again." };

  await supabase.from("onboarding_sessions").update({ status: "reviewing" }).eq("id", session.id);
  redirect(`/onboarding/${session.id}/review`);
}

export async function skipDiscovery(sessionId: string) {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) redirect("/dashboard");
  if (isOpen(session.status)) {
    await supabase
      .from("onboarding_sessions")
      .update({ status: "skipped", completed_at: new Date().toISOString() })
      .eq("id", session.id);
    startPlanAfterResponse(session.id);
  }
  redirect(`/analysis/${session.business_profile_id}`);
}

export async function submitReview(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!isOpen(session.status)) redirect(onboardingPath(session));

  const { data: candidates } = await supabase
    .from("onboarding_responses")
    .select("id, pain_point_id")
    .eq("session_id", session.id)
    .eq("kind", "pain_point");
  const parsed = parseReviewForm(
    formData,
    (candidates ?? []).map((c) => c.pain_point_id as string),
  );
  if ("error" in parsed) return { error: parsed.error };
  const { confirmedIds, priorities } = parsed.data;

  // (session_id, customer_priority) is unique, so clear old priorities before setting new ones.
  const { error: clearError } = await supabase
    .from("onboarding_responses")
    .update({ customer_priority: null })
    .eq("session_id", session.id);
  if (clearError) return { error: "Your priorities weren't saved. Try again." };

  for (const c of candidates ?? []) {
    const id = c.pain_point_id as string;
    const rank = priorities.indexOf(id) + 1;
    const { error } = await supabase
      .from("onboarding_responses")
      .update({ confirmed: confirmedIds.includes(id), customer_priority: rank || null })
      .eq("id", c.id);
    if (error) return { error: "Your priorities weren't saved. Try again." };
  }

  // Changed priorities: drop unanswered questions and those about issues that are no longer a priority.
  // Answers about the remaining priorities are kept, so nothing is asked twice.
  await supabase.from("onboarding_follow_ups").delete().eq("session_id", session.id).eq("status", "pending");
  await supabase
    .from("onboarding_follow_ups")
    .delete()
    .eq("session_id", session.id)
    .not("pain_point_id", "in", `(${priorities.map((p) => `"${p}"`).join(",")})`);

  await supabase.from("onboarding_sessions").update({ status: "following_up" }).eq("id", session.id);
  return continueFollowUps(supabase, session);
}

export async function submitFollowUps(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (session.status !== "following_up") redirect(onboardingPath(session));

  const { data: pending } = await supabase
    .from("onboarding_follow_ups")
    .select("id, pain_point_id, question_key")
    .eq("session_id", session.id)
    .eq("status", "pending");
  const parsed = parseFollowUpForm(
    formData,
    (pending ?? []).map((p) => ({ id: p.id, painPointId: p.pain_point_id, key: p.question_key })),
  );
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date().toISOString();
  for (const u of parsed.data) {
    const { error } = await supabase
      .from("onboarding_follow_ups")
      .update({ status: u.status, answer: u.answer, answered_at: now })
      .eq("id", u.id);
    if (error) return { error: "Your answers weren't saved. Try again." };
  }
  return continueFollowUps(supabase, session);
}

// "Skip the rest": unanswered questions are marked skipped and the plan starts.
export async function skipFollowUps(sessionId: string) {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) redirect("/dashboard");
  if (session.status !== "following_up") redirect(onboardingPath(session));
  await supabase
    .from("onboarding_follow_ups")
    .update({ status: "skipped", answered_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("status", "pending");
  return complete(supabase, session);
}