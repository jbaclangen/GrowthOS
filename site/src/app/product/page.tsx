import type { Metadata } from "next";
import { Band, CtaRow, PageHero, StatusBadge, type Status } from "@/components/ui";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Business Intelligence, Marketing Strategy, Content Studio, Website Intelligence, and what's coming next: CRM Intelligence, Automation, Analytics.",
};

// Module names: D-010. Status must match docs/product/MVP_SCOPE.md and web/src/lib/plans/tiers.ts.
const MODULES: { name: string; status: Status; summary: string; today: string[]; why: string }[] = [
  {
    name: "Business Intelligence",
    status: "live",
    summary: "A structured profile of your business, built from your website and your answers.",
    today: [
      "Reads your home page and up to five key pages",
      "Services, customers, locations, brand voice, strengths, gaps and likely competitors",
      "Guided discovery: what's holding the business back, your top three, and short follow-up questions",
    ],
    why: "Everything Braventa recommends or drafts starts from this profile, so nothing is generic.",
  },
  {
    name: "Marketing Strategy",
    status: "live",
    summary: "A growth score, a diagnosis you confirm, and one prioritized growth plan.",
    today: [
      "Growth score from measured site quality and assessed marketing readiness",
      "Findings marked Verified, From you, or Inferred, with confidence",
      "One plan: your priorities first, each action with a first step and a way to measure it",
      "Accept, dismiss or mark each action done",
    ],
    why: "A short, ranked answer to “what should we work on?” — and you decide what's right.",
  },
  {
    name: "Content Studio",
    status: "live",
    summary: "A 30-day content plan and drafted posts in your brand voice.",
    today: ["Goal, audience, content pillars and channels for the next 30 days", "Five drafted posts with image ideas", "Approve or reject each draft"],
    why: "From plan to usable work in one sitting, without starting from a blank page.",
  },
  {
    name: "Website Intelligence",
    status: "partial",
    summary: "Speed, SEO basics, and conversion gaps from your own site.",
    today: ["Google PageSpeed mobile scores", "Signals such as contact forms, phone numbers, meta descriptions and image alt text"],
    why: "Your website is often your first salesperson. Fix what's costing you inquiries first.",
  },
  {
    name: "CRM Intelligence",
    status: "next",
    summary: "Pipeline and follow-up insight, starting with HubSpot.",
    today: [],
    why: "We're building HubSpot support first. Braventa is designed to make your CRM more useful, not replace it.",
  },
  {
    name: "Automation",
    status: "next",
    summary: "Approved workflows that carry the plan into your tools.",
    today: [],
    why: "Workflows will include approval steps and logs. You'll decide what runs.",
  },
  {
    name: "Analytics",
    status: "next",
    summary: "What you did, what it achieved, and what to do next.",
    today: [],
    why: "Results from your connected tools will feed back into the plan.",
  },
];

export default function Product() {
  return (
    <>
      <PageHero eyebrow="Product" title="Seven modules. One picture of your business.">
        Each module reads from the same business profile. Live modules work today; the rest are labelled as coming next.
      </PageHero>
      <Band>
        <div className="space-y-6">
          {MODULES.map((m) => (
            <article key={m.name} className="card grid gap-6 md:grid-cols-[1fr_1.2fr]" aria-labelledby={`m-${m.name}`}>
              <div>
                <StatusBadge status={m.status} />
                <h2 id={`m-${m.name}`} className="mt-3 text-2xl">
                  {m.name}
                </h2>
                <p className="mt-2 text-muted">{m.summary}</p>
              </div>
              <div>
                {m.today.length > 0 ? (
                  <>
                    <p className="eyebrow">What it does today</p>
                    <ul className="mt-3 space-y-2">
                      {m.today.map((t) => (
                        <li key={t} className="flex gap-3 text-sm">
                          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="eyebrow">Planned</p>
                )}
                <p className="mt-4 text-sm text-muted">
                  <span className="font-semibold text-foreground">Why it matters: </span>
                  {m.why}
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-12">
          <CtaRow secondary={{ label: "See how it works", href: "/how-it-works" }} />
        </div>
      </Band>
    </>
  );
}
