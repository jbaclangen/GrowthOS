"use client";

import { useFormStatus } from "react-dom";

// Continue may ask follow-up questions or build the plan (when there is nothing worth asking), so the pending label
// names neither. Disabled while pending, so one click generates one round.
export function ContinueButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Preparing the next step…" : "Continue"}
    </button>
  );
}

// Says what the wait is for and how long it can take (VOICE_AND_MESSAGING §12): Continue waits on the extractor model
// (up to 2 x 120 s). Always rendered, so screen readers announce the text when it appears; empty, it takes no space.
export function ContinuePendingNote() {
  const { pending } = useFormStatus();
  return (
    <p role="status" className="mt-2 text-xs text-muted empty:mt-0">
      {pending ? "Choosing your follow-up questions, or starting your plan if there's nothing to ask. This can take a minute or two." : null}
    </p>
  );
}
