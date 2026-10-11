import type { Metadata } from "next";
import Link from "next/link";
import { Band, CtaRow, SectionIntro, StatusBadge, type Status } from "@/components/ui";
import { LIVE_TODAY } from "@/lib/site";

// Copy: docs/marketing/WEBSITE_MESSAGING.md §3, updated for the live product (discovery, confirmed diagnosis, one
// growth plan — ON-1–ON-8). D-005 lines (tagline, headline, one-liner) are used verbatim.

export const metadata: Metadata = {
  title: { absolute: "Braventa — Run your growth as one system" },
  description:
    "Braventa is a business growth system for service businesses. Know what to do next, then get it done — with you approving everything.",
};

const PROBLEMS = [
  { title: "No clear priorities.", body: "You know marketing matters. You don't know which task is worth this week." },
  { title: "Content without a plan.", body: "Posts happen when someone has a spare hour, about whatever comes to mind." },
  { title: "Reports that look backwards.", body: "They tell you what happened. They don't tell you what to do next." },
];

const LOOP: { stage: string; body: string; status: Status }[] = [
  {
    stage: "Understand",
    body: "Braventa learns your services, customers, locations, and brand voice, asks what's holding the business back, and diagnoses where you stand.",
    status: "live",
  },
  {
    stage: "Act",
    body: "One prioritized growth plan, a 30-day content plan, and drafted posts in your voice for you to approve. Carrying approved work into your tools is coming next.",
    status: "partial",
  },
  { stage: "Improve", body: "Measure what worked, learn from it, and adjust the plan.", status: "next" },
];

const MODULES: { name: string; body: string; status: Status }[] = [
  { name: "Business Intelligence", body: "A structured profile of your business, built from your website and your answers.", status: "live" },
  { name: "Marketing Strategy", body: "A growth score, a diagnosis you confirm, and one prioritized plan with a first step for each action.", status: "live" },
  { name: "Content Studio", body: "A 30-day content plan and drafted posts in your brand voice, ready for your approval.", status: "live" },
  { name: "Website Intelligence", body: "Speed, SEO basics, and conversion gaps from your own site, measured with Google PageSpeed.", status: "partial" },
  { name: "CRM Intelligence", body: "Pipeline and follow-up insight, starting with HubSpot.", status: "next" },
  { name: "Automation", body: "Approved workflows that carry the plan into your tools.", status: "next" },
  { name: "Analytics", body: "What you did, what it achieved, and what to do next.", status: "next" },
];

const STEPS = [
  { title: "Enter your website.", body: "Add your URL. Braventa reads your pages and checks them with Google PageSpeed while you answer a few questions." },
  { title: "Tell it what's hard.", body: "Pick what's holding the business back, in your own words if you like, and rank your top three." },
  { title: "Confirm the diagnosis.", body: "See what Braventa found and how sure it is. Mark anything wrong and the plan updates." },
  { title: "Work the plan.", body: "One prioritized plan, a 30-day content plan, and five drafted posts. Approve each one. Nothing goes out without you." },
];

const TRUST = [
  { title: "Approval by default.", body: "Every draft waits for you. Braventa does not publish or send anything on your behalf." },
  { title: "Your data, kept separate.", body: "Each organization's data is isolated from every other. Secret keys never leave our servers." },
  { title: "Clear about evidence.", body: "Every finding says where it came from: your website, Google PageSpeed, your answers, or Braventa's inference." },
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
              Braventa connects your website, marketing, CRM, and content into one growth system that shows you what to do
              next — and helps you get it done.
            </p>
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

      <Band tone="surface" labelledBy="loop-title">
        <SectionIntro head="Understand. Act. Improve." title="One loop, from insight to action." id="loop-title">
          Braventa organizes growth into three stages and keeps them connected, so what you learn shapes what you do next.
        </SectionIntro>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {LOOP.map((s, i) => (
            <li key={s.stage} className="card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-muted">0{i + 1}</span>
                <StatusBadge status={s.status} />
              </div>
              <h3 className="mt-3 text-2xl">{s.stage}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band labelledBy="steps-title">
        <SectionIntro head="How it works" title="From website to plan in one sitting." id="steps-title" />
        <ol className="mt-12 grid gap-6 md:grid-cols-4">
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

      <Band tone="surface" labelledBy="modules-title">
        <SectionIntro head="One system. Every step." title="Built as modules that share one picture of your business." id="modules-title">
          Every module reads from the same business profile, so nothing starts from a blank page.
        </SectionIntro>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <li key={m.name} className={`card ${m.status === "next" ? "bg-background" : ""}`}>
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
              Run your growth as one system.
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
          <p className="mt-1 text-sm text-brand-paper/80">Measured site quality and assessed marketing readiness</p>
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
