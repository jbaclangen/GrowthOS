import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ONBOARDING_STEP_COUNT, onboardingPath } from "@/lib/onboarding/steps";
import { canConnectSearchConsole, connectPlanLine } from "@/lib/integrations/connect-step";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { searchConsoleAccess } from "@/lib/integrations/search-console-access";
import { connectionReturnPath } from "@/lib/integrations/return-to";
import { suggestTools } from "@/lib/integrations/tool-catalog";
import { SearchConsoleCard } from "@/components/connections/search-console-card";
import { ToolCardList } from "@/components/connections/tool-cards";
import { continueAfterConnect } from "../actions";
import { EvidenceStatus } from "../evidence-status";
import { ContinueButton, ContinuePendingNote } from "./continue-button";

// "Connect your tools" (D-041, INTEGRATIONS_ROADMAP §2): an optional step between confirming priorities and the
// follow-up questions. Only Google Search Console can be connected (Pro and the Pro trial, owner only; paused on
// Basic); every other tool is Coming soon. Its data feeds the diagnosis and the growth score (D-051 step 6).
// The AI assistant connection (MCP) skips this step: connections are authorized only in Braventa.

export const metadata: Metadata = { title: "Connect your tools" };
// Analysis steps run in their own invocations (D-042). Continue calls the extractor model (up to 2 x 120 s) and
// hands the plan's first step on in after(). 300 s is the Vercel Hobby maximum.
export const maxDuration = 300;

export default function ConnectPage(props: PageProps<"/onboarding/[sessionId]/connect">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Connect {...props} />
      </Suspense>
    </main>
  );
}

async function Connect({ params }: PageProps<"/onboarding/[sessionId]/connect">) {
  const { sessionId } = await params;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("id, status, organization_id, business_profile_id, evidence_job_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();
  if (session.status !== "following_up") redirect(onboardingPath(session));

  const [membership, { data: orgRow }, { data: answers }, { data: profile }] = await Promise.all([
    getCurrentOrg(user.id),
    supabase.from("organizations").select("plan, trial_ends_at").eq("id", session.organization_id).maybeSingle(),
    supabase
      .from("onboarding_responses")
      .select("pain_point_id, confirmed, customer_priority")
      .eq("session_id", session.id)
      .eq("kind", "pain_point"),
    supabase.from("business_profiles").select("current_tools").eq("id", session.business_profile_id).maybeSingle(),
  ]);

  // The OAuth routes and actions act on the user's first membership, so connecting is offered only when that is the
  // business this session belongs to.
  const canConnectHere = membership?.id === session.organization_id;
  const isOwner = canConnectHere && membership?.role === "owner";
  // A deployment without the Google OAuth client or encryption key can't connect anything (the card says so), so the
  // intro, heading and plan line don't claim Search Console is live there.
  const configured = searchConsoleConfigured();
  const planLine = connectPlanLine({ configured, canConnectHere, isOwner, org: orgRow });
  const canConnect = canConnectSearchConsole({
    configured,
    hasBusiness: Boolean(membership),
    canConnectHere,
    isOwner,
    allowed: Boolean(orgRow && searchConsoleAccess(orgRow).allowed),
  });

  const suggestions = suggestTools({
    painPoints: (answers ?? []).map((a) => ({
      id: a.pain_point_id as string,
      confirmed: Boolean(a.confirmed),
      priority: (a.customer_priority as number | null) ?? null,
    })),
    tools: (profile?.current_tools as string[] | null) ?? [],
  });
  const searchConsole = suggestions.find((s) => s.tool.id === "search_console");
  const comingSoon = suggestions.filter((s) => s.tool.status === "coming_soon");
  const returnTo = connectionReturnPath(`/onboarding/${session.id}/connect`);

  return (
    <>
      <p className="eyebrow">Step 4 of {ONBOARDING_STEP_COUNT}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Connect your tools</h1>
      <p className="mt-2 text-sm text-muted">
        Optional. Connect the tools your business already uses.{" "}
        {configured
          ? "Today that's Google Search Console: Braventa shows your clicks, impressions, top searches and pages on Search performance and uses them in your diagnosis and growth score. More tools are coming soon."
          : "None can be connected here yet."}{" "}
        {canConnect ? "You can skip this step and connect Search Console later in Settings." : "You can skip this step."}
      </p>
      {planLine && <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm">{planLine}</p>}
      <EvidenceStatus jobId={session.evidence_job_id} />

      <section className="mt-8" aria-labelledby="live-now-heading">
        <h2 id="live-now-heading" className="text-lg font-semibold">
          {configured ? "Live now" : "Not set up yet"}
        </h2>
        <SearchConsoleCard
          org={membership}
          canConnectHere={canConnectHere}
          returnTo={returnTo}
          sectionId="search-console"
          reasons={searchConsole?.reasons}
          connectClassName="btn-secondary"
        />
      </section>

      <section className="mt-8" aria-labelledby="coming-soon-heading">
        <h2 id="coming-soon-heading" className="text-lg font-semibold">
          Coming soon
        </h2>
        <p className="mt-1 text-sm text-muted">These aren&apos;t available yet. They&apos;re marked Coming soon until they work.</p>
        <ToolCardList items={comingSoon} />
      </section>

      <form action={continueAfterConnect.bind(null, session.id)} className="mt-8 border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <ContinueButton />
          <Link href={`/onboarding/${session.id}/review`} className="text-sm text-muted underline-offset-2 hover:underline">
            Change your priorities
          </Link>
        </div>
        <ContinuePendingNote />
        <p className="mt-2 text-xs text-muted">Connecting is optional: Braventa builds your plan either way.</p>
      </form>
    </>
  );
}
