"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { disconnectGoogleAction } from "@/app/settings/connections-actions";

// Two steps, because disconnecting deletes the stored data. returnTo is the page to come back to (Settings or the
// onboarding step), checked again on the server. Google by default (one Google sign-in covers Search Console and
// Google Analytics 4); the HubSpot card passes its own action, label and explanation.
const GOOGLE_EXPLANATION =
  "Disconnecting revokes Braventa's access at Google, for both Search Console and Google Analytics, and deletes the data Braventa stored from them for this business. Your Google accounts aren't changed.";

export function DisconnectButton({
  returnTo,
  organizationId,
  action = disconnectGoogleAction,
  label = "Disconnect Google",
  explanation = GOOGLE_EXPLANATION,
}: {
  returnTo: string;
  // The business it acts on (D-062); the route or action checks the user's role there.
  organizationId: string;
  action?: (formData: FormData) => Promise<void>;
  label?: string;
  explanation?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="w-full rounded-md border border-border p-3 text-sm">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="organizationId" value={organizationId} />
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
