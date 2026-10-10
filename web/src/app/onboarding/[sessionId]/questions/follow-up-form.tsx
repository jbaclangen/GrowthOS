"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitFollowUps, skipFollowUps, type FormState } from "../actions";
import { MAX_ANSWER, NOT_APPLICABLE, type Question } from "@/lib/onboarding/followups";

export type AskedQuestion = { id: string; issue: string; priority: number | null; question: Question };

export function FollowUpForm({ sessionId, questions }: { sessionId: string; questions: AskedQuestion[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitFollowUps.bind(null, sessionId), undefined);
  const skip = skipFollowUps.bind(null, sessionId);

  if (!questions.length) {
    return (
      <form action={skip} className="card mt-6 space-y-3">
        <p className="text-sm">There are no more questions. Braventa has what it needs to build your plan.</p>
        <button type="submit" className="btn-primary">
          Build my plan
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="card mt-6 space-y-6">
      {questions.map((q) => (
        <QuestionField key={q.id} asked={q} />
      ))}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Continue"}
        </button>
        <button type="submit" formAction={skip} disabled={pending} className="btn-secondary">
          Skip the rest and build my plan
        </button>
        <Link href={`/onboarding/${sessionId}/review`} className="text-sm text-muted underline-offset-2 hover:underline">
          Change your priorities
        </Link>
      </div>
    </form>
  );
}

function QuestionField({ asked }: { asked: AskedQuestion }) {
  const { id, issue, priority, question } = asked;
  const [notApplicable, setNotApplicable] = useState(false);
  const describedBy = `why-${id}`;

  return (
    <fieldset aria-describedby={describedBy}>
      <legend>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {priority && <span className="chip bg-accent-soft text-accent-soft-foreground">Priority {priority}</span>}
          {issue}
        </span>
        <span className="mt-1.5 block text-sm font-medium">{question.text}</span>
      </legend>
      <p id={describedBy} className="mt-0.5 text-xs text-muted">
        {question.why}
      </p>

      {question.type === "choice" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {[...question.choices, { value: NOT_APPLICABLE, label: "Doesn't apply" }].map((c) => (
            <label
              key={c.value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft sm:min-h-9"
            >
              <input type="radio" name={`answer:${id}`} value={c.value} className="h-4 w-4 accent-accent" />
              {c.label}
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            name={`answer:${id}`}
            rows={2}
            maxLength={MAX_ANSWER}
            disabled={notApplicable}
            placeholder={question.placeholder}
            aria-label={question.text}
            className="input"
          />
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted sm:min-h-0">
            <input
              type="checkbox"
              name={`na:${id}`}
              checked={notApplicable}
              onChange={(e) => setNotApplicable(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Doesn&apos;t apply
          </label>
        </div>
      )}
    </fieldset>
  );
}
