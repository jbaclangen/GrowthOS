"use client";

import { useActionState } from "react";
import { requestUpgrade, type RequestState } from "./actions";

export function RequestForm({ tier, label }: { tier: "pro" | "premium"; label: string }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestUpgrade.bind(null, tier), undefined);

  if (state?.sent) {
    return (
      <p className="mt-4 rounded-md bg-success-soft px-3 py-2 text-sm" role="status">
        Thanks. The Braventa team will contact you about {label}.
      </p>
    );
  }
  return (
    <form action={action} className="mt-4 space-y-2">
      <label className="block text-sm">
        <span className="font-medium">
          What would you like help with? <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea name="message" rows={2} maxLength={1000} className="input mt-1" />
      </label>
      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Sending…" : `Talk to us about ${label}`}
      </button>
    </form>
  );
}
