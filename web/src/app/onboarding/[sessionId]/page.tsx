import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOpen, onboardingPath } from "@/lib/onboarding/steps";
import { DiscoveryForm } from "./discovery-form";
import { EvidenceStatus } from "./evidence-status";

export const metadata: Metadata = { title: "What's holding your business back" };
// Analysis steps run in their own invocations (D-042). Actions here call the extractor model (up to 2 x 120 s)
// and hand the plan's first step on in after(). 300 s is the Vercel Hobby maximum.
export const maxDuration = 300;

export default function DiscoveryPage(props: PageProps<"/onboarding/[sessionId]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Discovery {...props} />
      </Suspense>
    </main>
  );
}

async function Discovery({ params }: PageProps<"/onboarding/[sessionId]">) {
  const { sessionId } = await params;
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("id, status, business_profile_id, evidence_job_id, business_profiles(company_name)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();
  if (!isOpen(session.status)) redirect(onboardingPath(session));

  const { data: answers } = await supabase
    .from("onboarding_responses")
    .select("kind, pain_point_id, source, original_text")
    .eq("session_id", session.id);
  const selected = (answers ?? [])
    .filter((a) => a.kind === "pain_point" && a.source === "owner_selected")
    .map((a) => a.pain_point_id as string);
  const statement = (answers ?? []).find((a) => a.kind === "statement")?.original_text ?? null;
  const business = session.business_profiles as unknown as { company_name: string } | null;

  return (
    <>
      <p className="eyebrow">Step 2 of 4 · {business?.company_name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">What&apos;s making it hardest for your business to grow right now?</h1>
      <p className="mt-2 text-sm text-muted">
        Your answers decide what Braventa looks at first. Choose what applies, describe it in your own words, or both.
      </p>
      <EvidenceStatus jobId={session.evidence_job_id} />
      <DiscoveryForm sessionId={session.id} selected={selected} statement={statement} />
    </>
  );
}
