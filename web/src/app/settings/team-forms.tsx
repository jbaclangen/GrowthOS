"use client";

import { useActionState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/team/roles";
import { changeMemberRole, inviteMember, type InviteState, type MemberActionState } from "./team-actions";
import { CopyBlock } from "./copy-block";

// Settings → Team: invite someone and copy their one-time link (no email is sent yet, Q-010).
export function InviteForm({ organizationId, roles }: { organizationId: string; roles: Role[] }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, undefined);
  return (
    <div className="mt-4">
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <input type="hidden" name="organizationId" value={organizationId} />
        <label className="block text-sm">
          <span className="font-medium">Email address</span>
          <input name="email" type="email" maxLength={320} required autoComplete="off" placeholder="sam@example.com" className="input mt-1" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Role</span>
          <select name="role" defaultValue={roles.includes("analyst") ? "analyst" : roles[0]} className="input mt-1">
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating…" : "Create invite link"}
        </button>
      </form>
      {state?.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.link && (
        <div className="mt-4 rounded-md border border-border p-3 text-sm" role="status">
          <p className="font-medium text-accent">Copy the link now. You won&apos;t see it again.</p>
          <p className="mt-1 text-muted">
            Send it to {state.email} yourself, by email or chat. It makes them {state.role?.toLowerCase()} in {state.business}{" "}
            when they sign in or create an account with that address. It works once, for {state.days} days.
          </p>
          <CopyBlock label="Invite link" value={state.link} />
        </div>
      )}
    </div>
  );
}

// One member's role, changeable to any role below the manager's own.
export function RoleForm({ organizationId, userId, current, roles, email }: { organizationId: string; userId: string; current: Role; roles: Role[]; email: string }) {
  const [state, action, pending] = useActionState<MemberActionState, FormData>(changeMemberRole.bind(null, organizationId, userId), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role for {email}
      </label>
      <select id={`role-${userId}`} name="role" defaultValue={current} className="input w-auto">
        {roles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Saving…" : "Change role"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

// Asks before removing: the person loses access to the business at once.
export function RemoveButton({ email }: { email: string }) {
  return (
    <button
      type="submit"
      className="btn-secondary"
      onClick={(e) => {
        if (!window.confirm(`Remove ${email} from this business? They lose access right away.`)) e.preventDefault();
      }}
    >
      Remove
    </button>
  );
}
