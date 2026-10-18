"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseDiscoveryForm, parseReviewForm } from "@/lib/onboarding/discovery";
import { parseFollowUpForm } from "@/lib/onboarding/followups";
import { followUpPath, followUpStep, isOpen, onboardingPath } from "@/lib/onboarding/steps";
import * as onboarding from "@/lib/onboarding/service";

export type FormState = { error?: string } | undefined;

// All reads and writes go through the signed-in user's client, so RLS limits them to the user's organization.
// The steps themselves live in lib/onboarding/service.ts, shared with the AI assistant connection (D-036).
async function loadSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const session = await onboarding.loadSession(supabase, sessionId);
  return { supabase, session };
}

type Session = onboarding.Session;
type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function continueFollowUps(supabase: Db, session: Session): Promise<never> {
  const next = await onboarding.continueFollowUps(supabase, session);
  if (next === "completed") redirect(`/analysis/${session.business_profile_id}`);
  redirect(`/onboarding/${session.id}/questions`);
}

export async function submitDiscovery(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseDiscoveryForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, session } = await loadSession(sessionId);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!isOpen(session.status)) redirect(onboardingPath(session));

  const saved = await onboarding.saveDiscovery(supabase, session, parsed.data);
  if ("error" in saved) return { error: saved.error };
  redirect(`/onboarding/${session.id}/review`);
}

export async function skipDiscovery(sessionId: string) {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) redirect("/dashboard");
  if (isOpen(session.status)) await onboarding.skipDiscovery(supabase, session);
  redirect(`/analysis/${session.business_profile_id}`);
}

export async function submitReview(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!isOpen(session.status)) redirect(onboardingPath(session));

  const candidates = await onboarding.reviewCandidates(supabase, session);
  const parsed = parseReviewForm(
    formData,
    candidates.map((c) => c.pain_point_id),
  );
  if ("error" in parsed) return { error: parsed.error };

  const saved = await onboarding.saveReview(supabase, session, candidates, parsed.data);
  if ("error" in saved) return { error: saved.error };
  // Next is the optional "Connect your tools" step; its Continue asks the follow-up questions (continueAfterConnect).
  redirect(`/onboarding/${session.id}/connect`);
}

// "Continue" on "Connect your tools" (D-041), whether or not anything was connected: generates the next round of
// follow-up questions, or builds the plan when there is nothing worth asking.
export async function continueAfterConnect(sessionId: string) {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) redirect("/dashboard");
  if (session.status !== "following_up") redirect(onboardingPath(session));
  // A repeat after a round was generated (the back button, or a second tab later) goes to the questions instead of
  // generating another round. Two truly concurrent submits can still both pass this check (as with submitReview);
  // the button is disabled while pending, and addNextRound caps the rounds and the total.
  const pending = await onboarding.pendingFollowUps(supabase, session);
  if (followUpStep(pending.length) === "questions") redirect(followUpPath(session.id, pending.length));
  return continueFollowUps(supabase, session);
}

export async function submitFollowUps(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (session.status !== "following_up") redirect(onboardingPath(session));

  const pending = await onboarding.pendingFollowUps(supabase, session);
  const parsed = parseFollowUpForm(
    formData,
    pending.map((p) => ({ id: p.id, painPointId: p.pain_point_id, key: p.question_key })),
  );
  if ("error" in parsed) return { error: parsed.error };

  const saved = await onboarding.saveFollowUps(supabase, parsed.data);
  if ("error" in saved) return { error: saved.error };
  return continueFollowUps(supabase, session);
}

// "Skip the rest": unanswered questions are marked skipped and the plan starts.
export async function skipFollowUps(sessionId: string) {
  await requireUser();
  const { supabase, session } = await loadSession(sessionId);
  if (!session) redirect("/dashboard");
  if (session.status !== "following_up") redirect(onboardingPath(session));
  await onboarding.skipRemainingFollowUps(supabase, session);
  redirect(`/analysis/${session.business_profile_id}`);
}
