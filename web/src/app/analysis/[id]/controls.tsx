"use client";

import { useState, useTransition } from "react";
import { rerunAnalysis, setContentStatus } from "../actions";

export function RerunButton({ businessProfileId }: { businessProfileId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await rerunAnalysis(businessProfileId);
            setError(result?.error ?? null);
          })
        }
      >
        {pending ? "Starting…" : "Re-run analysis"}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContentActions({ itemId, status }: { itemId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const set = (s: "approved" | "rejected" | "needs_approval") =>
    start(async () => {
      const result = await setContentStatus(itemId, s);
      setError(result?.error ?? null);
    });

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "approved" || status === "rejected" ? (
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => set("needs_approval")}>
          Undo
        </button>
      ) : (
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => set("rejected")}>
            Reject
          </button>
          <button type="button" className="btn-primary !py-1.5" disabled={pending} onClick={() => set("approved")}>
            Approve
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="max-w-xs text-right text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
