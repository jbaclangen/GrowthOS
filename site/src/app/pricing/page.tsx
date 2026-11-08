import type { Metadata } from "next";
import Link from "next/link";
import { Band, PageHero } from "@/components/ui";
import { PRICES, PRIMARY_CTA, SEATS, TAGLINE } from "@/lib/site";
// The same tier list the app enforces (D-030), so the public plans can't drift from the product.
import { FEATURES, TIERS, TRIAL_DAYS, proHasLiveFeatures, type Tier } from "../../../../web/src/lib/plans/tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Basic ${PRICES.basic}, Pro ${PRICES.pro} and Premium ${PRICES.premium.toLowerCase()} a month, with a ${TRIAL_DAYS}-day Pro trial. One system for your website, your marketing, your tools and your plan.`,
};

const ORDER: Tier[] = ["basic", "pro", "premium"];
const PLUS: Record<Tier, string | null> = { basic: null, pro: "Everything in Basic, plus:", premium: "Everything in Pro, plus:" };

const FAQ = [
  {
    q: "How does the trial work?",
    a: `Every new account starts with ${TRIAL_DAYS} days of Pro. When the trial ends, you continue on Basic, a paid plan, and nothing is deleted. Connected tools pause on Basic and their data is kept.`,
  },
  {
    q: "What does Basic do?",
    a: "Braventa analyzes your website, diagnoses what's holding the business back and gives you one prioritized plan with a 30-day content plan and drafted posts. You carry out the changes yourself.",
  },
  {
    q: "What does Pro add?",
    a: "Your own numbers. Connect Google Search Console and Google Analytics 4 with one Google sign-in, and your search and website data are used in your diagnosis and growth score. Connect HubSpot to see your contacts and deals as counts. All read-only. Coming soon: more tools and AI agents that carry out approved changes for you.",
  },
  {
    q: "Can my team use it?",
    a: `Yes. Invite people by a link you copy, and give each person a role. Basic includes ${SEATS.basic}, Pro ${SEATS.pro}, and Premium ${SEATS.premium}. Extra seats can't be bought online yet.`,
  },
  {
    q: "Will anything happen without my approval?",
    a: "No. On every plan, nothing is published or changed for your business until it's approved. No one approves their own draft except the owner.",
  },
  {
    q: "Can my AI assistant fill in Braventa for me?",
    a: `Yes, if you use Claude Desktop or Claude Code. Create an access key in the app and your assistant can answer the setup and discovery questions for you; you still confirm the diagnosis and approve posts in the app. It works on every plan during the ${TRIAL_DAYS}-day trial. After the trial, access pauses until your business subscribes to a plan, and comes back as soon as it does. Connectors for claude.ai and ChatGPT are coming soon.`,
  },
  {
    q: "Can I pay online?",
    a: "Not yet. During early access we set up your plan with you directly — use Talk to us in the app or contact us here.",
  },
  {
    q: "Can I leave?",
    a: "Yes. The owner can remove a business from Settings. Its data is deleted at once and can't be recovered, and Braventa's access to your Google and HubSpot accounts is revoked.",
  },
];

export default function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="One system, one price a month.">
        Every account starts with a {TRIAL_DAYS}-day Pro trial. Then choose the plan that fits: Basic for a clear plan,
        Pro to bring in your own numbers, Premium for the systems your business runs on.
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
              <p className="mt-4">
                <span className="font-display text-4xl font-bold">{PRICES[tier]}</span>
                <span className="text-muted"> a month</span>
              </p>
              <p className="mt-3 text-muted">{TIERS[tier].summary}</p>
              <p className="mt-3 text-sm font-semibold">Team: {SEATS[tier]}</p>
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
        <p className="mt-6 text-sm text-muted">
          Prices are in US dollars. There&apos;s no online checkout yet: during early access, we set up your plan with you.{" "}
          <Link href="/contact" className="font-semibold text-accent hover:underline">
            Talk to us
          </Link>
        </p>
        {/* The AI assistant connection (MCP) isn't tier-gated like FEATURES: every plan during the trial, then any
            subscribed plan. Kept out of tiers.ts so the rule is stated exactly as decided. */}
        <section className="card mt-8" aria-labelledby="assistant-title">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="assistant-title" className="text-xl">
              Connect your AI assistant
            </h2>
            <span className="chip bg-success-soft text-foreground">Live</span>
            <span className="text-sm text-muted">Every plan</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Let Claude Desktop or Claude Code fill in Braventa&apos;s discovery for you, using a personal access key you can
            revoke at any time. Included on every plan during the {TRIAL_DAYS}-day trial; after the trial it pauses until
            your business subscribes to a plan. Connectors for claude.ai and ChatGPT are coming soon.
          </p>
        </section>
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

      <Band tone="ink" labelledBy="cta-title">
        <p className="section-head text-brand-volt">Early access</p>
        <h2 id="cta-title" className="mt-3 text-3xl leading-tight md:text-5xl">
          {TAGLINE}
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={PRIMARY_CTA.href} className="btn-primary">
            {PRIMARY_CTA.label}
          </Link>
          <Link href="/contact" className="btn-secondary">
            Talk to us
          </Link>
        </div>
      </Band>
    </>
  );
}
