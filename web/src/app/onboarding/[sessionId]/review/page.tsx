import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categoryLabel, getPainPoint } from "@/lib/onboarding/catalog";
import { EvidenceStatus } from "../evidence-status";
import { ReviewForm, type Candidate } from "./review-form";

export const metadata: Metadata = { title: "Confirm your priorities" };

export default function ReviewPage(props: PageProps<"/onboarding/[sessionId]/review">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Review {...props} />
      </Suspense>
    </main>
  );
}

async function Review({ params }: PageProps<"/onboarding/[sessionId]/review">) {
  const { sessionId } = await params;
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("id, status, business_profile_id, evidence_job_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();
  if (session.status === "completed" || session.status === "skipped") redirect(`/analysis/${session.business_profile_id}`);
  if (session.status === "discovering") redirect(`/onboarding/${session.id}`);

  const { data: answers } = await supabase
    .from("onboarding_responses")
    .select("kind, pain_point_id, source, original_text, ai_confidence, created_at")
    .eq("session_id", session.id)
    .order("created_at");

  const statement = (answers ?? []).find((a) => a.kind === "statement")?.original_text ?? null;
  const candidates: Candidate[] = (answers ?? []).flatMap((a) => {
    const pp = a.kind === "pain_point" ? getPainPoint(a.pain_point_id as string) : undefined;
    if (!pp) return [];
    return [
      {
        id: pp.id,
        label: pp.label,
        category: categoryLabel(pp.categoryId),
        suggested: a.source === "ai_suggested",
        confidence: a.ai_confidence as Candidate["confidence"],
        quote: a.source === "ai_suggested" ? a.original_text : null,
      },
    ];
  });
  const suggestedCount = candidates.filter((c) => c.suggested).length;

  return (
    <>
      <p className="eyebrow">Step 3 of 3</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Confirm your priorities</h1>
      <p className="mt-2 text-sm text-muted">
        Keep the issues that apply and choose what matters most. Your top three come first in your plan.
      </p>
      <EvidenceStatus jobId={session.evidence_job_id} />

      {statement && (
        <div className="card mt-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">In your words</h2>
            <span className="chip bg-accent-soft text-accent-soft-foreground">From you</span>
          </div>
          <p className="mt-2 text-sm">“{statement}”</p>
          <p className="mt-2 text-xs text-muted">
            {suggestedCount
              ? "Braventa matched your description to the issues marked “Suggested” below. Keep only the ones that fit."
              : "Braventa couldn't match this to a specific issue. It's still saved and used in your plan."}
          </p>
        </div>
      )}

      <ReviewForm sessionId={session.id} candidates={candidates} />
    </>
  );
}
