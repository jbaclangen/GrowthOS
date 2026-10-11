"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { disconnectSearchConsoleAction } from "./connections-actions";

// Two steps, because disconnecting deletes the stored Search Console data.
export function DisconnectButton() {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        Disconnect
      </button>
    );
  }
  return (
    <form action={disconnectSearchConsoleAction} className="w-full rounded-md border border-border p-3 text-sm">
      <p>
        Disconnecting revokes Braventa&apos;s access at Google and deletes the Search Console data Braventa stored for this
        business. Your Search Console account isn&apos;t changed.
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

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Disconnecting…" : "Disconnect and delete data"}
    </button>
  );
}
