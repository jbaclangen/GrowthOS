import type { Metadata } from "next";
import Link from "next/link";
import { Band, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "Trust and data",
  description:
    "How Braventa keeps you in control: approval before anything is published, isolated customer data, and clear labelling of AI output.",
};

// Facts only, matching docs/architecture/SECURITY_AND_PRIVACY.md. No certification claims (WEBSITE_MESSAGING §10).
const SECTIONS = [
  {
    title: "You approve everything",
    points: [
      "Every drafted post is marked as needing approval. Braventa does not publish or send anything on your behalf.",
      "The diagnosis and plan are proposals until you confirm them. You can mark any finding wrong and say what's true.",
    ],
  },
  {
    title: "Your data stays separate",
    points: [
      "Each organization's data is isolated from every other at the database level, with row-level security on every table that holds customer data.",
      "Secret keys stay on our servers and are never sent to your browser.",
      "Your own account can't change your plan, trial or AI usage limit; only trusted server code can.",
    ],
  },
  {
    title: "Clear about where answers come from",
    points: [
      "Every finding is marked Verified (your website or Google PageSpeed), From you (your answers), or Inferred (Braventa's reasoning), with a confidence level.",
      "Scores from Google PageSpeed are labelled as Google's. Other scores are Braventa's assessment, not a prediction of revenue.",
    ],
  },
  {
    title: "Careful with your website",
    points: [
      "Braventa reads public pages only, identifies itself, and refuses addresses on private or internal networks.",
      "Text read from websites is treated as data, never as instructions to the AI.",
    ],
  },
  {
    title: "Limits on AI use",
    points: [
      "Each organization has a monthly AI usage limit, and every AI call is logged with its cost.",
      "AI models receive only what a task needs.",
    ],
  },
];

export default function Trust() {
  return (
    <>
      <PageHero eyebrow="Trust and data" title="You stay in control of everything that goes out." />
      <Band>
        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.title} className="card" aria-labelledby={`t-${s.title}`}>
              <h2 id={`t-${s.title}`} className="text-xl">
                {s.title}
              </h2>
              <ul className="mt-3 space-y-2 text-muted">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="card" aria-labelledby="t-more">
            <h2 id="t-more" className="text-xl">
              More detail
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/trust/ai" className="text-accent hover:underline">
                  How Braventa uses AI
                </Link>
              </li>
              <li>
                <Link href="/legal/subprocessors" className="text-accent hover:underline">
                  Sub-processors
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-accent hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-accent hover:underline">
                  Ask us about your data, or request deletion
                </Link>
              </li>
            </ul>
          </section>
        </div>
        <p className="mt-8 text-sm text-muted">
          Braventa is in early access. We don&apos;t hold security certifications yet, and we&apos;ll say so here when we do.
        </p>
      </Band>
    </>
  );
}
