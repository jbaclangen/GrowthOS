"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitReview, skipDiscovery, type FormState } from "../actions";

export type Candidate = {
  id: string;
  label: string;
  category: string;
  suggested: boolean;
  confidence: "high" | "medium" | "low" | null;
  quote: string | null;
};

const CONFIDENCE_LABEL = { high: "Close match", medium: "Possible match", low: "Loose match" } as const;
const PRIORITIES = [
  { name: "priority1", label: "First priority" },
  { name: "priority2", label: "Second priority", optional: true },
  { name: "priority3", label: "Third priority", optional: true },
] as const;

export function ReviewForm({ sessionId, candidates }: { sessionId: string; candidates: Candidate[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview.bind(null, sessionId), undefined);
  // Owner-chosen issues start kept; AI suggestions start kept only when they are a close match.
  const [kept, setKept] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => !c.suggested || c.confidence === "high").map((c) => c.id)),
  );
  const [priorities, setPriorities] = useState<string[]>(["", "", ""]);

  const toggle = (id: string) => {
    setKept((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPriorities((prev) => prev.map((p) => (p === id ? "" : p)));
  };
  const keptList = candidates.filter((c) => kept.has(c.id));

  if (!candidates.length) {
    return (
      <div className="card mt-6 space-y-3">
        <p className="text-sm">There&apos;s nothing to confirm yet.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/onboarding/${sessionId}`} className="btn-secondary">
            Change answers
          </Link>
          <form action={skipDiscovery.bind(null, sessionId)}>
            <button type="submit" className="btn-primary">
              Build the plan from my website
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card mt-6 space-y-5">
      <fieldset>
        <legend className="text-sm font-medium">Issues to work on</legend>
        <div className="mt-2 space-y-3">
          {candidates.map((c) => (
            <label key={c.id} className="flex min-h-11 items-start gap-2 text-sm sm:min-h-0">
              <input
                type="checkbox"
                name="confirm"
                value={c.id}
                checked={kept.has(c.id)}
                onChange={() => toggle(c.id)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <span>
                {c.label}
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  {c.category}
                  {c.suggested ? (
                    <span className="chip bg-surface-muted text-muted">
                      Suggested · {CONFIDENCE_LABEL[c.confidence ?? "low"]}
                    </span>
                  ) : (
                    <span className="chip bg-accent-soft text-accent-soft-foreground">From you</span>
                  )}
                </span>
                {c.quote && <span className="mt-0.5 block text-xs text-muted">From what you wrote: “{c.quote}”</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-t border-border pt-4">
        <legend className="text-sm font-medium">Your top priorities</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {PRIORITIES.map((p, i) => (
            <label key={p.name} className="block">
              <span className="text-xs font-medium">
                {p.label} {"optional" in p && <span className="font-normal text-muted">(optional)</span>}
              </span>
              <select
                name={p.name}
                value={priorities[i]}
                onChange={(e) => setPriorities((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                className="input mt-1"
              >
                <option value="">{i === 0 ? "Choose an issue" : "None"}</option>
                {keptList
                  .filter((c) => c.id === priorities[i] || !priorities.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Continue"}
        </button>
        <Link href={`/onboarding/${sessionId}`} className="text-sm text-muted underline-offset-2 hover:underline">
          Change answers
        </Link>
      </div>
    </form>
  );
}
