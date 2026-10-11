import type { Metadata } from "next";
import { Band, CtaRow, PageHero, SectionIntro } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description:
    "Braventa helps small and mid-sized service businesses run growth as one connected system, instead of hiring a different person for every job.",
};

// Company story only, no names (founder decision 2026-10-11). Built from the founder's agency experience: websites,
// marketing, CRM, automation and AI systems for growing businesses in the US, Australia and Asia.

const VALUES = [
  { title: "Understand first.", body: "Every recommendation starts from how the business actually works." },
  { title: "One system, not more tools.", body: "Connect what you have before adding anything new." },
  { title: "You stay in control.", body: "Braventa recommends and drafts. You approve." },
  { title: "Honest about status.", body: "We say what works today and label what's coming next." },
  { title: "Measure, then improve.", body: "A plan is only useful if you can tell whether it worked." },
];

export default function About() {
  return (
    <>
      <PageHero eyebrow="About Braventa" title="Growth shouldn't need a different hire for every job.">
        Small and mid-sized businesses are told they need a web designer, an SEO specialist, a social media manager, a
        CRM consultant and an automation expert. Most can&apos;t afford all five — and the ones who can end up managing
        them.
      </PageHero>

      <Band labelledBy="story-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionIntro head="Our story" title="Built from years of doing the work by hand." id="story-title" />
          <div className="space-y-4 text-lg leading-relaxed text-muted">
            <p>
              Braventa comes out of nearly two decades of building websites, running marketing, setting up CRMs and
              automating processes for growing businesses — contractors, professional services firms, healthcare
              providers, real estate firms and cooperatives across the US, Australia and Asia.
            </p>
            <p>
              The same pattern showed up every time. The website came from one vendor, the ads from another, the CRM
              from a third, and nobody owned the whole. Owners ended up as project managers, deciding what mattered at
              the end of a long day.
            </p>
            <p>
              The approach that worked was always the same: understand the business, build the right system, measure
              everything, and improve continuously. Braventa puts that approach into one app — so a small team gets the
              thinking of a strategist, an analyst and a content writer, and stays in control of every change.
            </p>
          </div>
        </div>
      </Band>

      <Band tone="ink" labelledBy="mission-title">
        <SectionIntro head="Our mission" title="Run your growth as one system." id="mission-title" invert>
          Help small and mid-sized businesses get the services they need in one place: understand where they stand,
          know what to do next, and get it done — without hiring a different person for every job.
        </SectionIntro>
      </Band>

      <Band labelledBy="values-title">
        <SectionIntro head="How we work" title="What we hold ourselves to." id="values-title" />
        <ul className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {VALUES.map((v) => (
            <li key={v.title} className="card">
              <h3 className="text-lg">{v.title}</h3>
              <p className="mt-2 text-sm text-muted">{v.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12">
          <CtaRow secondary={{ label: "Contact us", href: "/contact" }} />
        </div>
      </Band>
    </>
  );
}
