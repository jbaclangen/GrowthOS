"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { disconnectGoogleAction } from "@/app/settings/connections-actions";

// Two steps, because disconnecting deletes the stored Search Console and Google Analytics data (one Google sign-in
// covers both). returnTo is the page to come back to
// (Settings or the onboarding step), checked again on the server.
export function DisconnectButton({ returnTo }: { returnTo: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        Disconnect Google
      </button>
    );
  }
  return (
    <form action={disconnectGoogleAction} className="w-full rounded-md border border-border p-3 text-sm">
      <input type="hidden" name="returnTo" value={returnTo} />
      <p>
        Disconnecting revokes Braventa&apos;s access at Google, for both Search Console and Google Analytics, and deletes the
        data Braventa stored from them for this business. Your Google accounts aren&apos;t changed.
      </p>
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
