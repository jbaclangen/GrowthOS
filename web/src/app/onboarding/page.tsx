import type { Metadata } from "next";
import Link from "next/link";
import { ONBOARDING_STEP_COUNT } from "@/lib/onboarding/steps";
import { StartForm } from "./start-form";

export const metadata: Metadata = { title: "Analyze your business" };
// Analysis steps run in their own invocations (D-042); after() here only hands a step on (up to ~50 s with
// retries). 300 s is the Vercel Hobby maximum.
export const maxDuration = 300;

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <p className="eyebrow">Step 1 of {ONBOARDING_STEP_COUNT}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analyze your business</h1>
      <p className="mt-2 text-sm text-muted">
        Braventa reads the website, builds a business profile, gives it a growth score and a diagnosis, builds a
        prioritized growth plan, plans 30 days of content and drafts the first posts for your approval.
      </p>
      <StartForm />
      <p className="mt-6 text-sm text-muted">
        Already worked on your business with Claude?{" "}
        <Link href="/settings#ai-assistant" className="text-accent hover:underline">
          Connect Claude and let it answer these questions
        </Link>
      </p>
    </main>
  );
}
