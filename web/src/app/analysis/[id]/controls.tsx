"use client";

import { useTransition } from "react";
import { rerunAnalysis, setContentStatus } from "../actions";

export function RerunButton({ businessProfileId }: { businessProfileId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(() => rerunAnalysis(businessProfileId))}>
      {pending ? "Starting…" : "Re-run analysis"}
    </button>
  );
}

export function ContentActions({ itemId, status }: { itemId: string; status: string }) {
  const [pending, start] = useTransition();
  const set = (s: "approved" | "rejected" | "needs_approval") => start(() => setContentStatus(itemId, s));

  if (status === "approved" || status === "rejected") {
    return (
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => set("needs_approval")}>
        Undo
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => set("rejected")}>
        Reject
      </button>
      <button type="button" className="btn-primary !py-1.5" disabled={pending} onClick={() => set("approved")}>
        Approve
      </button>
    </div>
  );
}
