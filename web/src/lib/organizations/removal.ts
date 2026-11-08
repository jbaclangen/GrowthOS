// Removing a business from Settings (D-061; docs/architecture/ROLES_AND_PERMISSIONS.md §9). Pure logic, unit-tested
// in removal.test.ts: who may remove, the phrase they must type, and the deletion log row, which keeps no personal
// data. The server action is app/settings/remove-business-actions.ts.

import { can, deniedMessage } from "@/lib/team/roles";

// Typed exactly, capital letters and the one space included. The server checks it again: the dialog's disabled button
// is a convenience, not the guard.
export const REMOVE_BUSINESS_PHRASE = "DELETE APPROVED";

export function isRemovalPhrase(value: unknown): boolean {
  return value === REMOVE_BUSINESS_PHRASE;
}

export const PHRASE_MESSAGE = `Type ${REMOVE_BUSINESS_PHRASE} exactly, in capital letters, to remove the business.`;
export const ACTIVE_JOB_MESSAGE =
  "An analysis is running for this business. Wait for it to finish (a few minutes), then remove the business.";
// Not "nothing was deleted": a failure after the revokes leaves the business but ends its Google and HubSpot access.
export const REMOVE_FAILED_MESSAGE = "The business wasn't removed. Try again in a minute.";

// The permission is checked before the phrase, so someone who may not remove the business learns that first.
export function removalAllowed(input: { role: string | null | undefined; phrase: unknown }): { ok: true } | { ok: false; error: string } {
  if (!can(input.role, "organization.delete")) return { ok: false, error: deniedMessage("organization.delete") };
  if (!isRemovalPhrase(input.phrase)) return { ok: false, error: PHRASE_MESSAGE };
  return { ok: true };
}

// What happened to a provider's tokens before the delete: none stored, every one revoked, or at least one revoke that
// failed or couldn't be confirmed. The tokens are deleted with the business either way.
export type RevokeOutcome = "none" | "revoked" | "failed";

export function revokeOutcome(results: readonly boolean[]): RevokeOutcome {
  if (results.length === 0) return "none";
  return results.every(Boolean) ? "revoked" : "failed";
}

const PLANS = ["trial", "basic", "pro", "premium"] as const;

export type DeletionLogRow = {
  organization_id: string;
  plan: (typeof PLANS)[number];
  organization_created_at: string;
  members: number;
  google_revoke: RevokeOutcome;
  hubspot_revoke: RevokeOutcome;
};

// The organization_deletions row. Built from named fields only, so no user id, email, business name or website can
// reach it by accident.
export function deletionLogRow(input: {
  organizationId: string;
  plan: string;
  createdAt: string;
  members: number;
  google: RevokeOutcome;
  hubspot: RevokeOutcome;
}): DeletionLogRow {
  return {
    organization_id: input.organizationId,
    plan: (PLANS as readonly string[]).includes(input.plan) ? (input.plan as DeletionLogRow["plan"]) : "trial",
    organization_created_at: input.createdAt,
    members: Math.max(0, Math.trunc(input.members)),
    google_revoke: input.google,
    hubspot_revoke: input.hubspot,
  };
}
