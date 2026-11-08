import type { Metadata } from "next";
import Link from "next/link";
import { Band, CtaRow, SectionIntro, StatusBadge, type Status } from "@/components/ui";
import { LIVE_TODAY, TAGLINE } from "@/lib/site";

// Copy: docs/marketing/WEBSITE_MESSAGING.md §0 and §3, updated for the live product (discovery, confirmed diagnosis,
// one growth plan — ON-1–ON-8), connected tools (D-058 Google Search Console and GA4 with one Google sign-in, D-059
// HubSpot counts), team roles and invites (D-046), Ask Braventa (D-043), the Claude connection (D-036) and removing a
// business (D-061). D-005 tagline and headline are used verbatim; the hero's supporting line follows D-035 because
// the D-005 one-liner says Braventa connects your CRM to everything, and HubSpot counts don't reach the plan yet.

export const metadata: Metadata = {
  title: { absolute: "Braventa — Run your growth as one system" },
  description:
    "Braventa is a business growth system for service businesses. Your website, your answers and your tools become one diagnosis and one plan you approve.",
};

const PROBLEMS = [
  { title: "No clear priorities.", body: "You know marketing matters. You don't know which task is worth this week." },
  { title: "Content without a plan.", body: "Posts happen when someone has a spare hour, about whatever comes to mind." },
  { title: "Numbers in too many places.", body: "Your website, Google and your CRM each tell part of the story. Nobody puts it together." },
];

// The unified flow: what goes in, the one picture it builds, and what comes out. Every item is live today; the
// connected tools are Pro (and the trial), which the copy says.
const INPUTS = [
  { title: "Your website", body: "Braventa reads up to 25 pages and runs Google's speed test on mobile and desktop." },
  { title: "Your answers", body: "What's holding the business back, your top three priorities, and a few follow-up questions." },
  {
    title: "Your tools",
    body: "On Pro: Google Search Console and Google Analytics 4 with one Google sign-in, and HubSpot. Read-only.",
  },
];
const PICTURE = ["A profile of your business", "A growth score from 0 to 100", "A diagnosis you confirm or correct"];
const OUTPUTS = [
  { title: "One growth plan", body: "Your priorities first, each action with a first step." },
  { title: "A 30-day content plan", body: "Goal, audience, topics and channels." },
  { title: "Five drafted posts", body: "In your brand voice, waiting for your approval." },
];

// The nine Growth Loop steps (D-004), named as in the founder's brief (D-035), grouped into the three stages.
const LOOP: { stage: string; steps: string; body: string; status: Status }[] = [
  {
    stage: "Understand",
    steps: "Understand · Diagnose · Prioritize",
    body: "Braventa learns your services, customers and brand voice, asks what's holding the business back, diagnoses where you stand, and puts your priorities first.",
    status: "live",
  },
  {
    stage: "Act",
    steps: "Plan · Create · Execute",
    body: "One prioritized growth plan, a 30-day content plan, and drafted posts in your voice for you to approve. Today you carry out the work; agents that do it in your tools are coming soon.",
    status: "partial",
  },
  {
    stage: "Improve",
    steps: "Measure · Learn · Optimize",
    body: "Measure what worked over time, learn from it, and adjust the plan.",
    status: "next",
  },
];

// D-010 module names. Status per web/src/lib/plans/tiers.ts and web/src/lib/modules/registry.ts.
const MODULES: { name: string; body: string; status: Status }[] = [
  { name: "Business Intelligence", body: "A profile of your business, built from your website and your answers.", status: "live" },
  { name: "Marketing Strategy", body: "A growth score, a diagnosis you confirm, and one prioritized plan with a first step for each action.", status: "live" },
  { name: "Content Studio", body: "A 30-day content plan and five drafted posts in your brand voice, ready for your approval.", status: "live" },
  { name: "Website Intelligence", body: "Speed, SEO basics and conversion gaps across up to 25 pages, with speed measured by Google PageSpeed.", status: "partial" },
  { name: "Analytics", body: "On Pro, your Google Search Console and Google Analytics 4 data count in your diagnosis and score. Reports over time are coming soon.", status: "partial" },
  { name: "CRM Intelligence", body: "On Pro, see your HubSpot contacts and deals as counts. Using them in your diagnosis is coming soon.", status: "partial" },
  { name: "Automation", body: "Workflows that carry approved work into your tools, with approval steps and logs.", status: "next" },
];

const STEPS = [
  { title: "Add your website.", body: "Enter your URL. Braventa reads your pages and checks them with Google PageSpeed while you answer a few questions." },
  { title: "Tell it what's hard.", body: "Pick common problems or describe them in your own words, then choose your top three." },
  { title: "Connect your tools.", body: "Optional, on Pro and the trial: one Google sign-in for Search Console and Analytics, and HubSpot." },
  { title: "Confirm the diagnosis.", body: "See what Braventa found and where each finding comes from. Mark anything wrong and the plan is rebuilt." },
  { title: "Work the plan.", body: "Accept, dismiss or mark each action done. Approve or reject your drafted posts." },
];

const TEAM: { title: string; body: string }[] = [
  {
    title: "Bring your team.",
    body: "Invite people with a link you copy and send. Fixed roles decide who can edit, approve drafts or connect tools. Each plan includes a number of seats.",
  },
  {
    title: "Ask Braventa.",
    body: "Ask how something works or what your report means, from the bar at the top of the app. It answers; it doesn't change anything.",
  },
  {
    title: "Work from Claude.",
    body: "If you use Claude Desktop or Claude Code, it can fill in your setup for you with an access key you can revoke at any time.",
  },
  {
    title: "Leave cleanly.",
    body: "The owner can remove a business from Settings. Its data is deleted at once, and Braventa's access to Google and HubSpot is revoked.",
  },
];

const TRUST = [
  { title: "Approval by default.", body: "Every draft waits for approval, and no one approves their own draft except the owner. Braventa doesn't publish or send anything for you." },
  { title: "Read-only connections.", body: "Braventa reads your Google and HubSpot data and can't change anything there. From HubSpot it keeps counts, not names or email addresses." },
  { title: "Clear about evidence.", body: "Every finding says where it came from: your website, Google PageSpeed, your connected Google data, your answers, or Braventa's inference." },
];

export default function Home() {
  return (
    <>
      <section className="bg-brand-ink text-brand-paper">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="section-head text-brand-volt">Business growth system</p>
            <h1 className="display mt-4">Know what to do next. Then get it done.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-paper/80">
              Braventa is an AI-assisted growth system that learns how your business works, helps uncover what&apos;s holding
              it back, and turns your priorities into a practical plan — with drafted work you review and approve.
            </p>
            <p className="mt-4 font-display text-xl font-bold text-brand-volt">{TAGLINE}</p>
            <div className="mt-8">
              <CtaRow
                secondary={{ label: "See how it works", href: "/how-it-works" }}
                note="Early access is invite-only. Nothing is published without your approval."
              />
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <Band labelledBy="problem-title">
        <SectionIntro head="Too many tools. No system." title="Your growth runs on disconnected pieces." id="problem-title">
          A website from one vendor. Social posts from another. A CRM nobody keeps up to date. An SEO report nobody acted on.
          Each piece does its job, but nobody owns the whole — so you end up as the project manager, deciding what matters
          at the end of a long day.
        </SectionIntro>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <li key={p.title} className="card">
              <h3 className="text-lg">{p.title}</h3>
              <p className="mt-2 text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="surface" labelledBy="system-title">
        <SectionIntro head={TAGLINE} title="Everything goes into one picture. One plan comes out." id="system-title">
          Braventa puts your website, your answers and the tools you connect in one place. It reads them together, shows
          you where the business stands, and gives you one plan to work from — instead of a report from each tool.
        </SectionIntro>
        <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          <section className="card" aria-labelledby="flow-in">
            <p id="flow-in" className="eyebrow">
              What goes in
            </p>
            <ul className="mt-4 space-y-4">
              {INPUTS.map((i) => (
                <li key={i.title}>
                  <h3 className="text-lg">{i.title}</h3>
                  <p className="mt-1 text-sm text-muted">{i.body}</p>
                </li>
              ))}
            </ul>
          </section>
          <FlowArrow />
          <section className="card flex flex-col justify-center bg-brand-ink text-brand-paper" aria-labelledby="flow-picture">
            <p id="flow-picture" className="eyebrow text-brand-volt">
              One picture of your business
            </p>
            <ul className="mt-4 space-y-3">
              {PICTURE.map((p) => (
                <li key={p} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-brand-volt" />
                  <span className="font-semibold">{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-brand-paper/75">Every part of Braventa works from this, so nothing starts from a blank page.</p>
          </section>
          <FlowArrow />
          <section className="card" aria-labelledby="flow-out">
            <p id="flow-out" className="eyebrow">
              What you get
            </p>
            <ul className="mt-4 space-y-4">
              {OUTPUTS.map((o) => (
                <li key={o.title}>
                  <h3 className="text-lg">{o.title}</h3>
                  <p className="mt-1 text-sm text-muted">{o.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="mt-6 text-sm text-muted">
          Connected tools are on Pro and the 14-day trial. Everything else is on every plan.
        </p>
      </Band>

      <Band labelledBy="steps-title">
        <SectionIntro head="How it works" title="From website to plan in one sitting." id="steps-title" />
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-accent font-display font-bold text-accent-foreground">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg">{s.title}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-3xl text-sm text-muted">{LIVE_TODAY}</p>
      </Band>

      <Band tone="surface" labelledBy="loop-title">
        <SectionIntro head="Understand. Act. Improve." title="One loop, from insight to action." id="loop-title">
          Braventa organizes growth into nine steps in three stages and keeps them connected, so what you learn shapes
          what you do next. Each stage is labelled with what works today.
        </SectionIntro>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {LOOP.map((s, i) => (
            <li key={s.stage} className="card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-muted">0{i + 1}</span>
                <StatusBadge status={s.status} />
              </div>
              <h3 className="mt-3 text-2xl">{s.stage}</h3>
              <p className="mt-1 text-sm font-semibold">{s.steps}</p>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band labelledBy="modules-title">
        <SectionIntro head="One system. Every step." title="Built as modules that share one picture of your business." id="modules-title">
          Live modules work today. Limited ones work with the gaps we name. The rest are labelled Coming soon.
        </SectionIntro>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <li key={m.name} className={`card ${m.status === "next" ? "bg-surface" : ""}`}>
              <StatusBadge status={m.status} />
              <h3 className="mt-3 text-lg">{m.name}</h3>
              <p className="mt-2 text-sm text-muted">{m.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/product" className="mt-8 inline-block text-sm font-semibold text-accent hover:underline">
          See every module →
        </Link>
      </Band>

      <Band tone="surface" labelledBy="team-title">
        <SectionIntro head="Made for small teams" title="Your whole team, in the same system." id="team-title">
          The people who help you grow work from the same plan, with access that fits their job.
        </SectionIntro>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((t) => (
            <li key={t.title} className="card bg-background">
              <StatusBadge status="live" />
              <h3 className="mt-3 text-lg">{t.title}</h3>
              <p className="mt-2 text-sm text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="ink" labelledBy="trust-title">
        <SectionIntro head="You approve. Always." title="You stay in control of everything that goes out." id="trust-title" invert />
        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {TRUST.map((t) => (
            <li key={t.title}>
              <h3 className="text-xl text-brand-paper">{t.title}</h3>
              <p className="mt-2 text-brand-paper/75">{t.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/trust" className="mt-10 inline-block text-sm font-semibold text-brand-volt hover:underline">
          Read how we handle your data →
        </Link>
      </Band>

      <Band labelledBy="early-title">
        <div className="card flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-2xl">
            <p className="section-head">Early access</p>
            <h2 id="early-title" className="mt-3 text-3xl md:text-4xl">
              {TAGLINE}
            </h2>
            <p className="mt-3 text-muted">
              We&apos;re working with a small group of service businesses during early access. Want to be one of them?
            </p>
          </div>
          <CtaRow secondary={{ label: "Ask a question", href: "/contact" }} />
        </div>
      </Band>
    </>
  );
}

// The arrow between the flow's columns: right on wide screens, down when the columns stack.
function FlowArrow() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center font-display text-3xl font-bold text-accent">
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </div>
  );
}

// A static, labelled illustration of the results screen: what the product shows, not real customer data.
function HeroPreview() {
  const rows = [
    { label: "Content clarity", value: 68 },
    { label: "Conversion readiness", value: 52 },
    { label: "Online presence", value: 62 },
  ];
  return (
    <figure className="rounded-xl border border-brand-paper/15 bg-brand-paper/5 p-6" aria-label="Example of a Braventa growth report">
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--color-brand-volt)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${0.62 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="56" textAnchor="middle" className="fill-current font-display text-[26px] font-bold">
            62
          </text>
        </svg>
        <div>
          <p className="eyebrow text-brand-paper/60">Growth score</p>
          <p className="mt-1 text-sm text-brand-paper/80">
            Measured site quality, assessed marketing readiness and, on Pro, your search and analytics data
          </p>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex justify-between">
              <span>{r.label}</span>
              <span className="font-semibold tabular-nums">{r.value}</span>
            </div>
            <div className="mt-1 h-2 rounded-pill bg-brand-paper/10">
              <div className="h-2 rounded-pill bg-brand-paper/80" style={{ width: `${r.value}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-lg bg-brand-paper/10 p-4 text-sm">
        <p className="eyebrow text-brand-paper/60">Do this first</p>
        <p className="mt-1 font-semibold">Add a clear project-inquiry path to your contact page</p>
      </div>
      <figcaption className="mt-4 text-xs text-brand-paper/60">Example report. Your results depend on your business.</figcaption>
    </figure>
  );
}
