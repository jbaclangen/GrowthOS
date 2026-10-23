"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseDiscoveryForm, parseReviewForm } from "@/lib/onboarding/discovery";
import { parseFollowUpForm } from "@/lib/onboarding/followups";
import { followUpPath, followUpStep, isOpen, onboardingPath } from "@/lib/onboarding/steps";
import * as onboarding from "@/lib/onboarding/service";
import { deniedMessage } from "@/lib/team/roles";
import { hasPermission } from "@/lib/team/server";

export type FormState = { error?: string } | undefined;

// All reads and writes go through the signed-in user's client, so RLS limits them to the user's organization, and
// every step needs profile.edit in that organization (D-046, lib/team/roles.ts; the AI assistant connection's tools
// check the same). The steps themselves live in lib/onboarding/service.ts, shared with that connection (D-036).
async function loadSession(sessionId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const session = await onboarding.loadSession(supabase, sessionId);
  const allowed = session ? await hasPermission(supabase, session.organization_id, userId, "profile.edit") : false;
  return { supabase, session, allowed };
}

const DENIED = deniedMessage("profile.edit");

type Session = onboarding.Session;
type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function continueFollowUps(supabase: Db, session: Session): Promise<never> {
  const next = await onboarding.continueFollowUps(supabase, session);
  if (next === "completed") redirect(`/analysis/${session.business_profile_id}`);
  redirect(`/onboarding/${session.id}/questions`);
}

export async function submitDiscovery(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseDiscoveryForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, session, allowed } = await loadSession(sessionId, user.id);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!allowed) return { error: DENIED };
  if (!isOpen(session.status)) redirect(onboardingPath(session));

  const saved = await onboarding.saveDiscovery(supabase, session, parsed.data);
  if ("error" in saved) return { error: saved.error };
  redirect(`/onboarding/${session.id}/review`);
}

// The form actions without a state (skip and continue) have nowhere to show a refusal, so one is thrown; the pages
// don't hide their buttons by role yet (ROLES_AND_PERMISSIONS.md §7).
export async function skipDiscovery(sessionId: string) {
  const user = await requireUser();
  const { supabase, session, allowed } = await loadSession(sessionId, user.id);
  if (!session) redirect("/dashboard");
  if (!allowed) throw new Error(DENIED);
  if (isOpen(session.status)) await onboarding.skipDiscovery(supabase, session);
  redirect(`/analysis/${session.business_profile_id}`);
}

export async function submitReview(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { supabase, session, allowed } = await loadSession(sessionId, user.id);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!allowed) return { error: DENIED };
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
  const user = await requireUser();
  const { supabase, session, allowed } = await loadSession(sessionId, user.id);
  if (!session) redirect("/dashboard");
  if (!allowed) throw new Error(DENIED);
  if (session.status !== "following_up") redirect(onboardingPath(session));
  // A repeat after a round was generated (the back button, or a second tab later) goes to the questions instead of
  // generating another round. Two truly concurrent submits can still both pass this check (as with submitReview);
  // the button is disabled while pending, and addNextRound caps the rounds and the total.
  const pending = await onboarding.pendingFollowUps(supabase, session);
  if (followUpStep(pending.length) === "questions") redirect(followUpPath(session.id, pending.length));
  return continueFollowUps(supabase, session);
}

export async function submitFollowUps(sessionId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { supabase, session, allowed } = await loadSession(sessionId, user.id);
  if (!session) return { error: "This onboarding session wasn't found." };
  if (!allowed) return { error: DENIED };
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
  const user = await requireUser();
  const { supabase, session, allowed } = await loadSession(sessionId, user.id);
  if (!session) redirect("/dashboard");
  if (!allowed) throw new Error(DENIED);
  if (session.status !== "following_up") redirect(onboardingPath(session));
  await onboarding.skipRemainingFollowUps(supabase, session);
  redirect(`/analysis/${session.business_profile_id}`);
}
