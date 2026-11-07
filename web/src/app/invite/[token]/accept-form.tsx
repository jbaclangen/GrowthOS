"use client";

import { useActionState } from "react";
import { acceptInvitation, type AcceptState } from "./actions";

export function AcceptForm({ token, organizationName }: { token: string; organizationName: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(() => acceptInvitation(token), undefined);
  return (
    <form action={action} className="mt-4">
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Joining…" : `Join ${organizationName}`}
      </button>
      {state?.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
