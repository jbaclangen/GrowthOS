"use client";

import { useFormStatus } from "react-dom";

// A form's submit button that shows progress while its server action runs.
export function SubmitButton({ label, pendingLabel, className = "btn-secondary" }: { label: string; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}
