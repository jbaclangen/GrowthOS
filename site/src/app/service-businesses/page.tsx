import type { Metadata } from "next";
import { Band, CtaRow, PageHero, SectionIntro } from "@/components/ui";

export const metadata: Metadata = {
  title: "For service businesses",
  description:
    "For owner-led service businesses that need a clear growth plan without a full marketing team. See what to do next and get help doing it.",
};

const PAIRS = [
  { pain: "You're on the tools all day.", answer: "Braventa gives you a short, ranked plan and drafts the posts, so marketing fits around the work." },
  { pain: "Inquiries come and go.", answer: "The diagnosis points to where inquiries are likely being lost — on your website, in follow-up, or in what you publish — and shows the evidence for each finding." },
  { pain: "You've paid for tools nobody uses.", answer: "Tell Braventa which tools you use, and the plan builds on them instead of recommending ones you already have." },
  { pain: "You can't hire a marketer, a web person and a strategist.", answer: "One system covers the analysis, the plan and the first drafts, with you approving each step." },
];

const EXAMPLES = [
  "Home and trade services",
  "Solar and electrical contractors",
  "Construction and engineering",
  "Professional services and consultancies",
  "Insurance and financial services agencies",
  "Healthcare and wellness practices",
  "Real estate firms",
  "Local businesses that rely on inquiries",
];

export default function ServiceBusinesses() {
  return (
    <>
      <PageHero eyebrow="For service businesses" title="Built for businesses that win work through inquiries.">
        For owner-led businesses with a small team, a website, some software, and no time to be a marketing department.
      </PageHero>

      <Band labelledBy="pairs-title">
        <SectionIntro head="Sound familiar?" title="What changes with Braventa." id="pairs-title" />
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {PAIRS.map((p) => (
            <li key={p.pain} className="card">
              <h3 className="text-lg">{p.pain}</h3>
              <p className="mt-2 text-muted">{p.answer}</p>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="surface" labelledBy="who-title">
        <SectionIntro head="Who it's for" title="If your business runs on inquiries, it's for you." id="who-title">
          These are examples, not limits. Braventa works from your website and your answers, so it adapts to how your
          business works. Regulated businesses, such as insurance, get drafts with compliance notes to check before
          approving.
        </SectionIntro>
        <ul className="mt-10 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <li key={e} className="rounded-pill border border-border bg-background px-4 py-2 text-sm">
              {e}
            </li>
          ))}
        </ul>
      </Band>

      <Band labelledBy="cta-title">
        <SectionIntro head="Early access" title="See what Braventa finds for your business." id="cta-title" />
        <div className="mt-8">
          <CtaRow secondary={{ label: "See how it works", href: "/how-it-works" }} />
        </div>
      </Band>
    </>
  );
}
