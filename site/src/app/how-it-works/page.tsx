import type { Metadata } from "next";
import { Band, CtaRow, PageHero, SectionIntro, StatusBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "How Braventa works",
  description:
    "See how Braventa turns your website and your answers into a confirmed diagnosis, one prioritized growth plan, a 30-day content plan, and drafted posts you approve.",
};

// Mirrors the live product flow: onboarding steps 1–4 (web/src/app/onboarding) and the analysis steps
// (STEPS in web/src/lib/pipeline/website-intel.ts).
const SETUP = [
  { step: "Your website", body: "Add your URL, and optionally your main goal, where you serve customers, and the tools you use. Braventa starts reading your site straight away." },
  { step: "What's holding you back", body: "Pick from common problems across leads, marketing, content, website, CRM, operations and more — or describe it in your own words. Braventa matches your words to the right issues and asks you to confirm." },
  { step: "Your top three", body: "Keep the issues that apply and rank what matters most. Your priorities come first in the plan." },
  { step: "A few follow-up questions", body: "Up to four short questions about your priorities, each with a reason. Skip any you'd rather not answer." },
];

const ANALYSIS = [
  "Reading the website",
  "Understanding the business",
  "Diagnosing and building your growth plan",
  "Building the 30-day plan",
  "Drafting your first posts",
];

const YOU_GET = [
  "A business profile: services, customers, locations, brand voice, strengths, gaps, and likely competitors.",
  "A growth score (0–100) with content clarity, conversion readiness and online presence, plus Google's mobile speed, SEO basics and accessibility scores.",
  "A diagnosis: 3–6 findings, each marked Verified, From you, or Inferred, with how sure Braventa is and what it couldn't confirm.",
  "One prioritized growth plan: for each action, why it matters, a first step, what it depends on, how you'll know it worked, and whether Braventa can help with it today.",
  "A 30-day content plan with a goal, audience, content pillars and channels.",
  "Five drafted posts in your brand voice, with image ideas — each waiting for your approval.",
];

const NOT_YET = [
  "Publish or schedule posts to your channels",
  "Send email for you",
  "Connect to your CRM (HubSpot comes first)",
  "Run automations in your tools",
  "Report on results from your analytics",
];

export default function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="How it works" title="Understand. Act. Improve.">
        Braventa starts with how your business actually works, tells you what to do first, and helps you get it done —
        with you approving everything that goes out.
      </PageHero>

      <Band labelledBy="setup-title">
        <SectionIntro head="Getting started" title="Tell Braventa about your business." id="setup-title">
          Setup takes a few minutes. Your website is read in the background while you answer.
        </SectionIntro>
        <ol className="mt-12 grid gap-4 md:grid-cols-2">
          {SETUP.map((s, i) => (
            <li key={s.step} className="card">
              <p className="eyebrow">Step {i + 1}</p>
              <h3 className="mt-2 text-xl">{s.step}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="surface" labelledBy="analysis-title">
        <SectionIntro head="What happens next" title="An analysis in about 3–4 minutes." id="analysis-title">
          You can leave and come back; the results page updates on its own.
        </SectionIntro>
        <ol className="mt-10 flex flex-col gap-3 md:flex-row">
          {ANALYSIS.map((a, i) => (
            <li key={a} className="flex-1 rounded-lg border border-border bg-background p-4">
              <span className="font-display text-sm font-bold text-accent">0{i + 1}</span>
              <p className="mt-1 text-sm">{a}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band labelledBy="get-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionIntro head="What you get" title="A plan you can believe, and work you can use." id="get-title" />
            <ul className="mt-8 space-y-4">
              {YOU_GET.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionIntro head="Your call" title="Confirm it, or correct it." />
            <p className="mt-6 text-muted">
              Mark any finding as right or wrong and say what&apos;s actually true. Braventa rebuilds the diagnosis and plan
              with your corrections, then you confirm the plan. Accept, dismiss or mark each action done as you work
              through it.
            </p>
            <div className="card mt-8">
              <h3 className="text-lg">What Braventa doesn&apos;t do yet</h3>
              <ul className="mt-4 space-y-3">
                {NOT_YET.map((item) => (
                  <li key={item} className="flex items-center justify-between gap-3 text-sm">
                    <span>{item}</span>
                    <StatusBadge status="next" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Band>

      <Band tone="ink" labelledBy="cta-title">
        <SectionIntro head="Early access" title="Start with your website." id="cta-title" invert>
          In about four minutes you&apos;ll know what to do next.
        </SectionIntro>
        <div className="mt-8">
          <CtaRow secondary={{ label: "See pricing", href: "/pricing" }} />
        </div>
      </Band>
    </>
  );
}
