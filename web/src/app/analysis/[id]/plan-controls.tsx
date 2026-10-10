"use client";

import { useState, useTransition } from "react";
import {
  confirmDiagnosis,
  requestDiagnosisUpdate,
  setFindingVerdict,
  setPlanItemStatus,
  type ActionResult,
} from "../plan-actions";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (result.error) setError(result.error);
    });
  return { pending, error, run };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="mt-2 text-sm text-danger" role="alert">
      {error}
    </p>
  ) : null;
}

// ON-7: the owner says whether each finding is right, and corrects the wrong ones.
export function FindingReview({
  findingId,
  verdict,
  note,
}: {
  findingId: string;
  verdict: "pending" | "confirmed" | "rejected";
  note: string | null;
}) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");

  if (verdict !== "pending" && !editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className={verdict === "confirmed" ? "text-success" : "text-danger"}>
          {verdict === "confirmed" ? "You said this is right" : "You said this is wrong"}
        </span>
        {verdict === "rejected" && note && <span className="text-muted">— “{note}”</span>}
        <button
          type="button"
          className="text-muted underline-offset-2 hover:underline"
          disabled={pending}
          onClick={() => run(() => setFindingVerdict(findingId, "pending", null))}
        >
          Change
        </button>
        <ErrorText error={error} />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <label className="block text-sm">
          <span className="font-medium">
            What&apos;s actually true? <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={2}
            className="input mt-1"
            placeholder="For example: we do reply within the hour, but only on weekdays"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const r = await setFindingVerdict(findingId, "rejected", draft);
                if (!r.error) setEditing(false);
                return r;
              })
            }
          >
            {pending ? "Saving…" : "Save correction"}
          </button>
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
        <ErrorText error={error} />
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary !py-1.5"
          disabled={pending}
          onClick={() => run(() => setFindingVerdict(findingId, "confirmed", null))}
        >
          That&apos;s right
        </button>
        <button type="button" className="btn-secondary !py-1.5" disabled={pending} onClick={() => setEditing(true)}>
          Not right
        </button>
      </div>
      <ErrorText error={error} />
    </div>
  );
}

// Confirm the diagnosis, or rebuild it with the owner's corrections first.
export function DiagnosisActions({ diagnosisId, hasCorrections }: { diagnosisId: string; hasCorrections: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div className="mt-4 border-t border-border pt-4">
      {hasCorrections ? (
        <>
          <p className="text-sm text-muted">
            Braventa rebuilds the diagnosis and plan with your corrections. It takes about a minute; your 30-day
            plan and drafts stay as they are.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            disabled={pending}
            onClick={() => run(() => requestDiagnosisUpdate(diagnosisId))}
          >
            {pending ? "Starting…" : "Update the plan with my corrections"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Check each finding. When it looks right, confirm it and your plan is set in this order.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            disabled={pending}
            onClick={() => run(() => confirmDiagnosis(diagnosisId))}
          >
            {pending ? "Saving…" : "Confirm diagnosis and plan"}
          </button>
        </>
      )}
      <ErrorText error={error} />
    </div>
  );
}

const STATUS_TEXT = { accepted: "You're on it", dismissed: "Dismissed", done: "Done" } as const;

// MS-5: accept, dismiss or mark done; undo returns the item to open.
export function PlanItemActions({ itemId, status }: { itemId: string; status: "proposed" | "accepted" | "dismissed" | "done" }) {
  const { pending, error, run } = useAction();
  const set = (s: "proposed" | "accepted" | "dismissed" | "done") => run(() => setPlanItemStatus(itemId, s));

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "proposed" && <span className="text-sm text-muted">{STATUS_TEXT[status]}</span>}
        {status === "proposed" && (
          <>
            <button type="button" className="btn-primary !py-1.5" disabled={pending} onClick={() => set("accepted")}>
              I&apos;ll do this
            </button>
            <button type="button" className="btn-secondary !py-1.5" disabled={pending} onClick={() => set("dismissed")}>
              Not for us
            </button>
          </>
        )}
        {status === "accepted" && (
          <button type="button" className="btn-primary !py-1.5" disabled={pending} onClick={() => set("done")}>
            Mark done
          </button>
        )}
        {status !== "proposed" && (
          <button type="button" className="btn-secondary !py-1.5" disabled={pending} onClick={() => set("proposed")}>
            Undo
          </button>
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}
