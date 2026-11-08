"use client";

import { useActionState } from "react";
import Link from "next/link";
import { startAnalysis, type StartState } from "../analysis/actions";
import { OwnerQuestions } from "@/components/owner-questions";
import { ConsentCheckbox, LegalLink } from "@/components/legal/consent";

// For someone who already has a business (D-062): whether this website is for the business they're working on or for
// a new one, and why a new one isn't possible when the account is at its business limit.
export type BusinessChoice = { currentName: string; startNew: boolean; atLimit: string | null };

export function StartForm({ choice }: { choice: BusinessChoice | null }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startAnalysis, undefined);

  return (
    <form action={action} className="card mt-8 space-y-4">
      {choice && (
        <fieldset>
          <legend className="text-sm font-medium">Which business is this website for?</legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="business" value="current" defaultChecked={!choice.startNew} className="mt-1" />
              <span>{choice.currentName}</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="business"
                value="new"
                defaultChecked={choice.startNew}
                disabled={Boolean(choice.atLimit)}
                aria-describedby={choice.atLimit ? "new-business-limit" : undefined}
                className="mt-1"
              />
              <span>A new business</span>
            </label>
            {choice.atLimit && (
              <p id="new-business-limit" className="text-xs text-muted">
                {choice.atLimit}{" "}
                <Link href="/plans" className="underline">
                  See plans
                </Link>
              </p>
            )}
          </div>
        </fieldset>
      )}
      <label className="block">
        <span className="text-sm font-medium">Website</span>
        <input
          name="website"
          required
          placeholder="example.com"
          inputMode="url"
          autoComplete="url"
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">
          Business name <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="businessName" placeholder="We'll detect it from your website" className="input mt-1" />
      </label>
      <p className="text-xs text-muted">
        Braventa reads up to 25 public pages and follows your site&apos;s robots.txt. It never logs in.
      </p>

      <div className="border-t border-border pt-4">
        <h2 className="text-base font-semibold">Tailor your plan</h2>
        <p className="mt-1 text-xs text-muted">
          Three optional questions. Your answers shape the diagnosis, the growth plan, the 30-day plan and the
          drafts. Skip them and Braventa works from your website alone.
        </p>
        <div className="mt-4">
          <OwnerQuestions />
        </div>
      </div>

      {/* D-057, Terms §7: only websites the person owns or may act for. */}
      <ConsentCheckbox id="website-authorized">
        I own this website, or I&apos;m authorized to act for the business that does (
        <LegalLink doc="terms">Terms of Service</LegalLink>, section 7).
      </ConsentCheckbox>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
          {state.atLimit && (
            <>
              {" "}
              <Link href="/plans" className="underline">
                See plans
              </Link>
            </>
          )}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Starting…" : "Analyze website"}
      </button>
      <p className="text-xs text-muted">
        Next: a few questions about what&apos;s holding the business back, while Braventa reads your website. You can
        leave and come back.
      </p>
    </form>
  );
}
