import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPainPoint } from "@/lib/onboarding/catalog";
import { getQuestion, MAX_FOLLOW_UPS } from "@/lib/onboarding/followups";
import { onboardingPath } from "@/lib/onboarding/steps";
import { EvidenceStatus } from "../evidence-status";
import { FollowUpForm, type AskedQuestion } from "./follow-up-form";

export const metadata: Metadata = { title: "A few more questions" };

export default function QuestionsPage(props: PageProps<"/onboarding/[sessionId]/questions">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Questions {...props} />
      </Suspense>
    </main>
  );
}

async function Questions({ params }: PageProps<"/onboarding/[sessionId]/questions">) {
  const { sessionId } = await params;
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("id, status, business_profile_id, evidence_job_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();
  if (session.status !== "following_up") redirect(onboardingPath(session));

  const [{ data: rows }, { data: priorities }] = await Promise.all([
    supabase
      .from("onboarding_follow_ups")
      .select("id, pain_point_id, question_key, status, created_at")
      .eq("session_id", session.id)
      .order("created_at"),
    supabase
      .from("onboarding_responses")
      .select("pain_point_id, customer_priority")
      .eq("session_id", session.id)
      .not("customer_priority", "is", null),
  ]);
  const rankOf = new Map((priorities ?? []).map((p) => [p.pain_point_id, p.customer_priority as number]));

  const asked: AskedQuestion[] = (rows ?? [])
    .filter((r) => r.status === "pending")
    .flatMap((r) => {
      const q = getQuestion(r.pain_point_id, r.question_key);
      const pp = getPainPoint(r.pain_point_id);
      if (!q || !pp) return [];
      return [{ id: r.id, issue: pp.label, priority: rankOf.get(r.pain_point_id) ?? null, question: q }];
    })
    .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
  const done = (rows ?? []).length - asked.length;

  return (
    <>
      <p className="eyebrow">Step 4 of 4</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">A few more questions</h1>
      <p className="mt-2 text-sm text-muted">
        About your top priorities, so the plan fits how your business works. At most {MAX_FOLLOW_UPS} in total
        {done > 0 ? `, and ${done} ${done === 1 ? "is" : "are"} done` : ""}. Skip any you&apos;d rather not answer.
      </p>
      <EvidenceStatus jobId={session.evidence_job_id} />
      <FollowUpForm sessionId={session.id} questions={asked} />
    </>
  );
}
