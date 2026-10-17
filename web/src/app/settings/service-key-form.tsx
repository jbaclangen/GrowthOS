"use client";

import { useActionState } from "react";
import { createServiceKey, type CreateServiceKeyState } from "./integrations-actions";
import { CopyBlock } from "./copy-block";

// Owner-only: create an organization-level key for automation. Shown once.
export function ServiceKeyForm({ serverUrl }: { serverUrl: string }) {
  const [state, action, pending] = useActionState<CreateServiceKeyState, FormData>(createServiceKey, undefined);

  return (
    <div className="mt-4">
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block text-sm">
          <span className="font-medium">Key name</span>
          <input name="name" maxLength={60} required placeholder="n8n onboarding workflow" className="input mt-1" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Expires</span>
          <select name="expiry" defaultValue="90" className="input mt-1">
            <option value="30">In 30 days</option>
            <option value="90">In 90 days</option>
            <option value="365">In 1 year</option>
            <option value="never">Never</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating…" : "Create service key"}
        </button>
      </form>
      {state?.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.key && (
        <div className="mt-4 rounded-md border border-border p-3 text-sm" role="status">
          <p className="font-medium text-accent">Copy it now. You won&apos;t see &quot;{state.name}&quot; again.</p>
          <CopyBlock label="Service key" value={state.key} />
          <p className="mt-3 text-muted">Send it as a header on every request to {serverUrl}:</p>
          <CopyBlock label="Header" value={`Authorization: Bearer ${state.key}`} />
        </div>
      )}
    </div>
  );
}
