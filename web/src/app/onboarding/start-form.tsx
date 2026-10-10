"use client";

import { useActionState } from "react";
import { startAnalysis, type StartState } from "../analysis/actions";

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
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Starting…" : "Analyze website"}
      </button>
      <p className="text-xs text-muted">Takes about 3–4 minutes. You can leave the page and come back.</p>
    </form>
  );
}
