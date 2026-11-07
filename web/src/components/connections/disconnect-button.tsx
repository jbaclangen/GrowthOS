"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { disconnectSearchConsoleAction } from "@/app/settings/connections-actions";

// Two steps, because disconnecting deletes the stored data. returnTo is the page to come back to (Settings or the
// onboarding step), checked again on the server. Search Console by default; the HubSpot card passes its own action
// and explanation.
const SEARCH_CONSOLE_EXPLANATION =
  "Disconnecting revokes Braventa's access at Google and deletes the Search Console data Braventa stored for this business. Your Search Console account isn't changed.";

export function DisconnectButton({
  returnTo,
  action = disconnectSearchConsoleAction,
  explanation = SEARCH_CONSOLE_EXPLANATION,
}: {
  returnTo: string;
  action?: (formData: FormData) => Promise<void>;
  explanation?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        Disconnect
      </button>
    );
  }
  return (
    <form action={action} className="w-full rounded-md border border-border p-3 text-sm">
      <input type="hidden" name="returnTo" value={returnTo} />
      <p>{explanation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ConfirmButton />
        <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
          Keep connected
        </button>
      </div>
    </form>
  );
}

// Destructive: secondary style in the danger color (component-guidelines), so the view keeps one primary action.
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-danger">
      {pending ? "Disconnecting…" : "Disconnect and delete data"}
    </button>
  );
}
