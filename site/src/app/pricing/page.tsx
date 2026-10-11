import type { Metadata } from "next";
import Link from "next/link";
import { Band, PageHero } from "@/components/ui";
import { PRIMARY_CTA } from "@/lib/site";
// The same tier list the app enforces (D-030), so the public plans can't drift from the product.
import { FEATURES, TIERS, TRIAL_DAYS, proHasLiveFeatures, type Tier } from "../../../../web/src/lib/plans/tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Basic, Pro and Premium plans, with a ${TRIAL_DAYS}-day Pro trial. Pricing is being finalized during early access.`,
};

const ORDER: Tier[] = ["basic", "pro", "premium"];
const PLUS: Record<Tier, string | null> = { basic: null, pro: "Everything in Basic, plus:", premium: "Everything in Pro, plus:" };

const FAQ = [
  {
    q: "How does the trial work?",
    a: `Every new account starts with ${TRIAL_DAYS} days of Pro. When the trial ends, the account moves to Basic and nothing is deleted.`,
  },
  {
    q: "What does Basic do?",
    a: "Braventa analyzes your business, diagnoses what's holding it back and gives you a prioritized plan with drafted content. You carry out the changes yourself.",
  },
  {
    q: "What does Pro add?",
    a: "Connections to your tools and AI agents that carry out approved changes for you. These are coming soon; until they ship, the trial and Basic include the same tools.",
  },
  {
    q: "Will anything happen without my approval?",
    a: "No. On every plan, nothing is published or changed for your business until you approve it.",
  },
  {
    q: "Why no prices yet?",
    a: "We're setting pricing with our early-access customers. Request early access and we'll walk you through it.",
  },
  {
    q: "How do I change plans?",
    a: "There's no online checkout yet. During early access, plan changes are arranged with us directly — use Talk to us in the app or contact us here.",
  },
];

export default function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Plans that grow with your business.">
        Every account starts with a {TRIAL_DAYS}-day Pro trial. Pricing is being finalized during early access.
      </PageHero>

      <Band>
        {!proHasLiveFeatures() && (
          <p className="mb-8 rounded-md bg-surface-muted px-4 py-3 text-sm">
            Pro and Premium features are coming soon. Today every plan has the same tools: the ones marked Live.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          {ORDER.map((tier) => (
            <section key={tier} className={`card flex flex-col ${tier === "pro" ? "border-accent" : ""}`} aria-labelledby={`tier-${tier}`}>
              <div className="flex items-center gap-2">
                <h2 id={`tier-${tier}`} className="text-2xl">
                  {TIERS[tier].label}
                </h2>
                {tier === "pro" && <span className="chip bg-accent-soft text-accent-soft-foreground">{TRIAL_DAYS}-day trial</span>}
              </div>
              <p className="mt-2 text-muted">{TIERS[tier].summary}</p>
              <p className="mt-4 font-display text-lg font-bold">{tier === "premium" ? "Custom" : "Pricing to be announced"}</p>
              {PLUS[tier] && <p className="mt-6 text-sm font-semibold">{PLUS[tier]}</p>}
              <ul className="mt-3 flex-1 space-y-3">
                {FEATURES.filter((f) => f.minTier === tier).map((f) => (
                  <li key={f.id} className="text-sm">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{f.label}</span>
                      {f.status === "live" ? (
                        <span className="chip bg-success-soft text-foreground">Live</span>
                      ) : (
                        <span className="chip border border-border text-muted">Coming soon</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-muted">{f.detail}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier === "premium" ? "/contact?intent=demo" : PRIMARY_CTA.href}
                className={`mt-6 ${tier === "pro" ? "btn-primary" : "btn-secondary"}`}
              >
                {tier === "premium" ? "Talk to us" : PRIMARY_CTA.label}
              </Link>
            </section>
          ))}
        </div>
      </Band>

      <Band tone="surface" labelledBy="faq-title">
        <h2 id="faq-title" className="text-3xl">
          Questions
        </h2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-lg font-semibold">{f.q}</dt>
              <dd className="mt-2 text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Band>
    </>
  );
}
