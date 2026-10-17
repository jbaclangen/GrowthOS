"use client";

import { useActionState } from "react";
import { decideAuthorization, type ConsentState } from "./actions";

type Org = { id: string; name: string; paused: boolean };

export function ConsentForm({ params, orgs }: { params: Record<string, string | undefined>; orgs: Org[] }) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(decideAuthorization, undefined);

  return (
    <form action={action} className="card mt-6 space-y-4">
      {Object.entries(params).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}

      {orgs.length === 1 ? (
        <div className="text-sm">
          <p className="font-medium">Business</p>
          <p className="mt-1">{orgs[0].name}</p>
          <input type="hidden" name="organizationId" value={orgs[0].id} />
          {orgs[0].paused && <PausedNote />}
        </div>
      ) : (
        <fieldset className="text-sm">
          <legend className="font-medium">Which business?</legend>
          <div className="mt-2 space-y-2">
            {orgs.map((o, i) => (
              <label key={o.id} className="flex items-start gap-2">
                <input type="radio" name="organizationId" value={o.id} defaultChecked={i === 0} required className="mt-1" />
                <span>
                  {o.name}
                  {o.paused && <span className="block text-xs text-muted">Paused: the free trial has ended.</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="approve" disabled={pending} className="btn-primary">
          {pending ? "Connecting…" : "Approve"}
        </button>
        <button type="submit" name="decision" value="deny" disabled={pending} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function PausedNote() {
  return (
    <p className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-xs" role="status">
      The free trial has ended, so the app can connect but its requests are paused until the business is on a plan.
    </p>
  );
}
