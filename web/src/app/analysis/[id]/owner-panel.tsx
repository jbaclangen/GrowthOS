"use client";

import { useActionState, useState } from "react";
import { saveOwnerInputs, type OwnerInputsState } from "../actions";
import { OwnerQuestions } from "@/components/owner-questions";
import { hasOwnerInputs, type OwnerInputs } from "@/lib/owner-inputs";

// The owner's guided-onboarding answers (BI-12): shown as Customer-provided ("From you") and editable.
// Edits apply to the next analysis run.
export function OwnerPanel({ businessProfileId, inputs }: { businessProfileId: string; inputs: OwnerInputs }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<OwnerInputsState, FormData>(
    async (prev, formData) => {
      const result = await saveOwnerInputs(businessProfileId, prev, formData);
      if (result?.saved) setEditing(false);
      return result;
    },
    undefined,
  );
  const filled = hasOwnerInputs(inputs);

  return (
    <section className="card" aria-labelledby="owner-panel-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="owner-panel-title" className="font-semibold">
            Your goal and context
          </h2>
          <span className="chip bg-accent-soft text-accent-soft-foreground">From you</span>
        </div>
        {!editing && (
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            {filled ? "Edit answers" : "Add answers"}
          </button>
        )}
      </div>

      {editing ? (
        <form action={action} className="mt-4 space-y-4">
          <OwnerQuestions defaults={inputs} />
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Save answers"}
            </button>
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : filled ? (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <Answer label="Main goal" value={inputs.goal} />
          <Answer label="Where you serve customers" value={inputs.serviceArea} />
          <Answer label="Tools you use" value={inputs.tools.join(", ") || null} />
        </dl>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Add your main goal, where you serve customers and the tools you use, so the next analysis is tailored to
          your business instead of your website alone.
        </p>
      )}

      {state?.saved && !editing && (
        <p className="mt-3 text-sm" role="status">
          Answers saved. Re-run the analysis to update the opportunities, plan and drafts.
        </p>
      )}
    </section>
  );
}

function Answer({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value ?? <span className="text-muted">Not answered</span>}</dd>
    </div>
  );
}
