// Team invitations (D-046): the owner or an admin creates an invite for one email address and copies a one-time link
// to send however they like. There is no transactional email yet (Q-010); when there is, the same link goes in the
// email. Pure logic, unit-tested in invitations.test.ts. Spec: docs/architecture/ROLES_AND_PERMISSIONS.md §8.
//
// The link carries a random token, brv_inv_ + 43 base64url characters; only its SHA-256 is stored, like every other
// secret (lib/oauth/tokens.ts). An invite works once, for 7 days, and only for an account with the invited email.

import { z } from "zod";
import { randomSecret, sha256Hex } from "@/lib/oauth/tokens";

export const INVITE_PREFIX = "brv_inv_";
export const INVITE_TTL_DAYS = 7;
const TOKEN = /^brv_inv_[A-Za-z0-9_-]{43}$/;

export const newInviteToken = () => randomSecret(INVITE_PREFIX);
export const inviteTokenHash = (token: string) => sha256Hex(token);
export const isInviteToken = (value: unknown): value is string => typeof value === "string" && TOKEN.test(value);

export const invitePath = (token: string) => `/invite/${token}`;

const email = z.email().max(320);

// Lowercased and trimmed, or null when it isn't an email address.
export function normalizeEmail(value: unknown): string | null {
  const parsed = email.safeParse(typeof value === "string" ? value.trim().toLowerCase() : value);
  return parsed.success ? parsed.data : null;
}

export type InvitationRow = {
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

export type InvitationState = "open" | "accepted" | "revoked" | "expired";

export function invitationState(row: InvitationRow, now = new Date()): InvitationState {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "open";
}

// Why a signed-in person can't accept this invite, in words, or null when they can. Belonging to other businesses
// doesn't stop anyone (D-062): the business switcher chooses which one they work on, and joining one doesn't count
// toward their own business limit (that counts businesses they own, and no invite makes someone an owner).
export function acceptBlocker(input: {
  state: InvitationState;
  invitedEmail: string;
  userEmail: string | null | undefined;
  alreadyMember: boolean;
  organizationName: string;
}): string | null {
  if (input.alreadyMember) return `You're already in ${input.organizationName}.`;
  if (input.state === "accepted") return "This invite has already been used. Ask for a new one if you still need to join.";
  if (input.state === "revoked") return "This invite was withdrawn. Ask the person who invited you for a new one.";
  if (input.state === "expired") return `This invite expired (invites last ${INVITE_TTL_DAYS} days). Ask for a new one.`;
  if ((input.userEmail ?? "").toLowerCase() !== input.invitedEmail) {
    return `This invite is for ${input.invitedEmail}. Sign out, open this link again and sign in or create an account with that email address.`;
  }
  return null;
}
