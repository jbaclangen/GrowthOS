import type { Metadata } from "next";
import { Band, CtaRow, PageHero, SectionIntro, StatusBadge, type Status } from "@/components/ui";

export const metadata: Metadata = {
  title: "How Braventa works",
  description:
    "See how Braventa turns your website and your answers into a confirmed diagnosis, one prioritized growth plan, a 30-day content plan, and drafted posts you approve.",
};

// Mirrors the live product flow: onboarding steps 1–4 (web/src/app/onboarding, web/src/lib/onboarding) and the
// analysis steps (STEPS in web/src/lib/pipeline/website-intel.ts). Re-check both before changing a claim here.
const SETUP = [
  {
    step: "Your website",
    body: "Add your URL, and optionally your main goal, where you serve customers, and the tools you use. Braventa starts reading your site straight away.",
  },
  {
    step: "What's holding you back",
    body: "Pick from common problems across leads, marketing, content, website, CRM, operations and more, or describe what's going on in your own words. Braventa matches your words to likely issues and shows which part of what you wrote each match is based on.",
  },
  {
    step: "Your top three",
    body: "Keep the matches that are right, drop the ones that aren't, and choose your first, second and third priority. Your priorities come first in the plan.",
  },
  {
    step: "A few follow-up questions",
    body: "Braventa picks up to four questions based on your goal, your priorities and what you've already said, so your plan reflects your business — not a generic marketing checklist. Each one says why it's asked, and you can skip any of them.",
  },
];

const ANALYSIS = [
  "Reading the website",
  "Understanding the business",
  "Diagnosing and building your growth plan",
  "Building the 30-day plan",
  "Drafting your first posts",
];

// computeGrowthScore() in web/src/lib/modules/score.ts (D-051): a renormalized mean over the feature modules that
// have evidence. Braventa's three assessed scores carry 0.65 and Google's four PageSpeed scores 0.35; without
// PageSpeed the assessed scores carry it all. On Pro, with Google Search Console connected, Search visibility adds
// 0.10 (about a tenth of the score; FEATURE_MODULES.md §9). The report names the modules the score is based on.
const MEASURED = ["Mobile speed", "SEO basics", "Accessibility", "Best practices"];
const ASSESSED = ["Content clarity", "Conversion readiness", "Online presence"];
const SCORE_LIMITS = [
  "If Google PageSpeed doesn't respond, the report says so and the score is based on Braventa's assessment alone.",
  "On Pro, with Google Search Console connected, your real search data joins the score as a third, smaller part (about a tenth): average position, click-through rate, the trend in clicks, how many of your pages Google serves and whether your home page is indexed. The report says which modules your score is based on.",
  "It reflects your website (the home page and up to 24 more public pages) and what you tell Braventa. It doesn't measure your whole business, your finances or your reputation.",
  "It isn't a prediction of revenue, leads or rankings. Use it to see where you stand and what to fix first.",
  "Google's SEO basics score is Lighthouse's automated check of one page's technical basics. It isn't a Google ranking score and isn't Search Console data.",
  "Braventa's part is an AI assessment and can be wrong. Findings show their evidence so you can check them.",
];

const YOU_GET = [
  "A business profile: services, customers, locations, brand voice, strengths, gaps, and likely competitors.",
  "A growth score (0–100) with content clarity, conversion readiness and online presence, plus Google's mobile speed, SEO basics, accessibility and best-practices scores when PageSpeed responds.",
  "A diagnosis: 3–6 findings, each marked Verified, From you, or Inferred, with how sure Braventa is and what it couldn't confirm.",
  "One prioritized growth plan: for each action, why it matters, a first step, what it depends on, how you'll know it worked, and whether Braventa can help with it today.",
  "A 30-day content plan with a goal, audience, content pillars and channels.",
  "Five drafted posts in your brand voice, with image ideas — each waiting for your approval.",
];

// The nine Growth Loop steps (D-004), named as in the founder's brief (D-035). Status per
// docs/product/BUSINESS_METHODOLOGY.md and the code; change a status only in the PR that ships it.
const LOOP: { stage: string; steps: { name: string; body: string; status: Status }[] }[] = [
  {
    stage: "Understand",
    steps: [
      { name: "Understand", body: "A profile of your business from your website and your answers.", status: "live" },
      { name: "Diagnose", body: "Findings with their evidence and confidence, which you confirm or correct.", status: "live" },
      { name: "Prioritize", body: "Your top three first, then actions ranked by impact, urgency, confidence and effort.", status: "live" },
    ],
  },
  {
    stage: "Act",
    steps: [
      { name: "Plan", body: "One growth plan and a 30-day content plan.", status: "live" },
      { name: "Create", body: "Five drafted posts to approve or reject. The rest of the content plan stays as topics.", status: "partial" },
      { name: "Execute", body: "Today you carry out the plan yourself. Connecting your tools is coming soon.", status: "next" },
    ],
  },
  {
    stage: "Improve",
    steps: [
      { name: "Measure", body: "Results from your connected tools.", status: "next" },
      { name: "Learn", body: "What worked and what didn't.", status: "next" },
      { name: "Optimize", body: "A plan that adjusts to what you learn.", status: "next" },
    ],
  },
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
        Braventa starts with how your business actually works, helps you work out what to do first, and helps you get it
        done — with you approving everything that goes out.
      </PageHero>

      <Band labelledBy="setup-title">
        <SectionIntro head="Getting started" title="Tell Braventa about your business." id="setup-title">
          Setup adapts to your answers instead of running through a fixed questionnaire. It takes a few minutes, and your
          website is read in the background while you answer.
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
        <p className="mt-8 max-w-3xl text-sm text-muted">
          Already work on your business in Claude? With Claude Desktop or Claude Code, your assistant can fill in these
          steps for you using a personal access key from the app. You still confirm the diagnosis and approve posts in
          Braventa. Connectors for claude.ai and ChatGPT are coming soon.
        </p>
      </Band>

      <Band tone="surface" labelledBy="analysis-title">
        <SectionIntro head="What happens next" title="Braventa builds your diagnosis and plan." id="analysis-title">
          This usually takes a few minutes. You can leave and come back; the results page updates on its own.
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

      <Band labelledBy="score-title">
        <SectionIntro head="The growth score" title="What the score measures, and what it doesn't." id="score-title">
          A score from 0 to 100 for how ready your website is to win business. It is based on the modules that have
          evidence for your business, and the report says which. On every plan that is two kinds of input, labelled
          in the report.
        </SectionIntro>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className="card" aria-labelledby="score-measured">
            <p className="eyebrow">About a third of the score</p>
            <h3 id="score-measured" className="mt-2 text-xl">
              Measured by Google PageSpeed
            </h3>
            <p className="mt-2 text-sm text-muted">
              Google&apos;s own mobile test of the web address you enter. These scores are Google&apos;s, shown as they come
              back.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {MEASURED.map((m) => (
                <li key={m} className="chip bg-surface-muted text-foreground">
                  {m}
                </li>
              ))}
            </ul>
          </section>
          <section className="card" aria-labelledby="score-assessed">
            <p className="eyebrow">About two-thirds of the score</p>
            <h3 id="score-assessed" className="mt-2 text-xl">
              Assessed by Braventa
            </h3>
            <p className="mt-2 text-sm text-muted">
              Braventa&apos;s AI assessment of your pages and site signals — such as a contact form, a phone number, meta
              descriptions, headings, whether structured data is present, image alt text and social links — with your answers as context.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {ASSESSED.map((a) => (
                <li key={a} className="chip bg-surface-muted text-foreground">
                  {a}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <ul className="mt-8 max-w-3xl space-y-3">
          {SCORE_LIMITS.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-muted">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="surface" labelledBy="get-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionIntro head="What you get" title="A plan you can check, and work you can use." id="get-title" />
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
            <div className="card mt-8 bg-background">
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

      <Band labelledBy="loop-title">
        <SectionIntro head="The Growth Loop" title="Nine steps, labelled with what works today." id="loop-title">
          Braventa follows one loop from understanding your business to improving the plan. The first steps work today;
          the rest are labelled until they ship.
        </SectionIntro>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {LOOP.map((stage) => (
            <section key={stage.stage} className="card" aria-labelledby={`loop-${stage.stage}`}>
              <h3 id={`loop-${stage.stage}`} className="text-2xl">
                {stage.stage}
              </h3>
              <ol className="mt-4 space-y-4">
                {stage.steps.map((s) => (
                  <li key={s.name}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      <StatusBadge status={s.status} />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{s.body}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </Band>

      <Band tone="ink" labelledBy="cta-title">
        <SectionIntro head="Early access" title="Start with your website." id="cta-title" invert>
          A few minutes of questions, a few minutes of analysis, and you&apos;ll know what to do next.
        </SectionIntro>
        <div className="mt-8">
          <CtaRow secondary={{ label: "See pricing", href: "/pricing" }} />
        </div>
      </Band>
    </>
  );
}
