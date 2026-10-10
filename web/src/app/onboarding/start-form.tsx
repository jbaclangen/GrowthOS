"use client";

import { useActionState } from "react";
import { startAnalysis, type StartState } from "../analysis/actions";
import { OwnerQuestions } from "@/components/owner-questions";

export function StartForm() {
  const [state, action, pending] = useActionState<StartState, FormData>(startAnalysis, undefined);

  return (
    <form action={action} className="card mt-8 space-y-4">
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

      <div className="border-t border-border pt-4">
        <h2 className="text-base font-semibold">Tailor your plan</h2>
        <p className="mt-1 text-xs text-muted">
          Three optional questions. Your answers shape the opportunities, the 30-day plan and the drafts. Skip
          them and Braventa works from your website alone.
        </p>
        <div className="mt-4">
          <OwnerQuestions />
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
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
