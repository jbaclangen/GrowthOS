import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getOrgAccess } from "@/lib/plans/access";
import { FEATURES, TIERS, proHasLiveFeatures, type Tier } from "@/lib/plans/tiers";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Plans />
      </Suspense>
    </main>
  );
}

const ORDER: Tier[] = ["basic", "pro", "premium"];
const PREVIOUS: Record<Tier, string | null> = { basic: null, pro: "Everything in Basic, plus:", premium: "Everything in Pro, plus:" };

async function Plans() {
  await requireUser();
  const access = await getOrgAccess();
  const trial = access?.trial;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
      <p className="mt-1 text-sm text-muted" role="status">
        {!access
          ? "Every new account starts with a 14-day Pro trial."
          : trial?.active
            ? `You're on a Pro trial, with ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left. After it ends you keep Basic.`
            : trial
              ? "Your Pro trial has ended. You're on Basic: Braventa recommends, and you carry out the changes yourself."
              : `You're on ${TIERS[access.tier].label}.`}
      </p>
      {!proHasLiveFeatures() && (
        <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm">
          Pro and Premium features are coming soon. Today every plan, including the trial, has the same tools: the ones
          marked Live below.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ORDER.map((tier) => {
          const current = access?.tier === tier;
          const features = FEATURES.filter((f) => f.minTier === tier);
          return (
            <section
              key={tier}
              className={`card flex flex-col ${current ? "border-accent" : ""}`}
              aria-labelledby={`tier-${tier}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={`tier-${tier}`} className="text-lg font-semibold">
                  {TIERS[tier].label}
                </h2>
                {current && (
                  <span className="chip bg-accent-soft text-accent-soft-foreground">
                    {trial?.active && tier === "pro" ? "Your trial" : "Your plan"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{TIERS[tier].summary}</p>
              <p className="mt-3 text-xs text-muted">Pricing to be announced.</p>

              {PREVIOUS[tier] && <p className="mt-4 text-sm font-medium">{PREVIOUS[tier]}</p>}
              <ul className="mt-2 flex-1 space-y-3">
                {features.map((f) => (
                  <li key={f.id} className="text-sm">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{f.label}</span>
                      {f.status === "live" ? (
                        <span className="chip bg-success-soft text-foreground">Live</span>
                      ) : (
                        <span className="chip bg-surface-muted text-muted">Coming soon</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{f.detail}</span>
                  </li>
                ))}
              </ul>

              {access && (tier === "basic" ? access.stored === "trial" && !trial?.active : !current) && (
                // After the trial, Basic is also a plan to sign up for (D-036): it brings back the AI assistant connection.
                <RequestForm tier={tier} label={TIERS[tier].label} />
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted">
        Every plan keeps human approval: nothing is published or changed for your business until you approve it.
      </p>
    </>
  );
}
