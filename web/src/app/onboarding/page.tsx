import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { accountUsage } from "@/lib/organizations/limit-server";
import { limitMessage } from "@/lib/plans/business-limit";
import { ONBOARDING_STEP_COUNT } from "@/lib/onboarding/steps";
import { StartForm, type BusinessChoice } from "./start-form";

export const metadata: Metadata = { title: "Analyze your business" };
// Analysis steps run in their own invocations (D-042); after() here only hands a step on (up to ~50 s with
// retries). 300 s is the Vercel Hobby maximum.
export const maxDuration = 300;

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <p className="eyebrow">Step 1 of {ONBOARDING_STEP_COUNT}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analyze your business</h1>
      <p className="mt-2 text-sm text-muted">
        Braventa reads the website, builds a business profile, gives it a growth score and a diagnosis, builds a
        prioritized growth plan, plans 30 days of content and drafts the first posts for your approval.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
        <Start searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-sm text-muted">
        Already worked on your business with Claude?{" "}
        <Link href="/settings#ai-assistant" className="text-accent hover:underline">
          Connect Claude and let it answer these questions
        </Link>
      </p>
    </main>
  );
}

// Someone who already has a business chooses whether this website is for it or for a new business (D-062). A new one
// counts toward the account's business limit; at the limit, the choice says so and links to /plans
// (create_organization refuses it in the database too).
async function Start({ searchParams }: { searchParams: PageProps<"/onboarding">["searchParams"] }) {
  const { business } = await searchParams;
  const user = await requireUser();
  const [org, usage] = await Promise.all([
    getCurrentOrg(user.id),
    createSupabaseServerClient().then((db) => accountUsage(db, user.id)),
  ]);
  const choice: BusinessChoice | null = org
    ? {
        currentName: org.name,
        startNew: business === "new" && !usage?.atLimit,
        atLimit: usage?.atLimit ? limitMessage(usage) : null,
      }
    : null;
  return <StartForm choice={choice} />;
}
