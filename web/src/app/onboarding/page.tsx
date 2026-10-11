import type { Metadata } from "next";
import { StartForm } from "./start-form";

export const metadata: Metadata = { title: "Analyze your business" };
// Analysis jobs run in after() for up to ~4 minutes; 300 s is the Vercel Hobby maximum.
export const maxDuration = 300;

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <p className="eyebrow">Step 1 of 4</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analyze your business</h1>
      <p className="mt-2 text-sm text-muted">
        Braventa reads the website, builds a business profile, scores its growth potential, finds the five
        highest-value opportunities, plans 30 days of content and drafts the first posts for your approval.
      </p>
      <StartForm />
    </main>
  );
}
