import { effectiveAccess } from "@/lib/plans/tiers";
import { can } from "@/lib/team/roles";

// Rules for the Search Console card (Settings → Connections and the onboarding step "Connect your tools", D-041) and
// the plan line above it. Pure logic, unit-tested, so the role, Pro, trial and Basic rules aren't buried in JSX.
// Who may connect is the integrations.connect permission (owner only, D-046; lib/team/roles.ts).

export type SearchConsoleCardState =
  // The Google OAuth client or the encryption key isn't configured for this deployment.
  | "not-configured"
  // The onboarding session belongs to a business other than the user's first membership, which is the one the
  // OAuth routes and actions act on (or the user has no membership at all). The card shows nothing of `org`.
  | "other-business"
  // The signed-in user has no business yet (Settings).
  | "no-business"
  | "connectable"
  | "owner-only"
  | "paused-not-connected"
  | "paused-connected"
  | "connected";

export function searchConsoleCardState(input: {
  configured: boolean;
  hasBusiness: boolean;
  canConnectHere: boolean;
  // The user's role in the business (memberships.role), or null without a membership.
  role: string | null | undefined;
  // searchConsoleAccess(org).allowed: Pro, Premium and an active trial.
  allowed: boolean;
  connection: { status: string } | null;
}): SearchConsoleCardState {
  if (!input.configured) return "not-configured";
  if (!input.canConnectHere) return "other-business";
  if (!input.hasBusiness) return "no-business";
  const connected = Boolean(input.connection && input.connection.status !== "revoked");
  if (!input.allowed) return connected ? "paused-connected" : "paused-not-connected";
  if (connected) return "connected";
  return can(input.role, "integrations.connect") ? "connectable" : "owner-only";
}

export const OTHER_BUSINESS_LINE = "Tools for this business can't be connected from this account yet. You can continue without them.";
export const NON_OWNER_LINE = "Only the business owner can connect tools. You can continue without them.";

export function trialLine(daysLeft: number) {
  return `Connecting tools is part of Pro, and your free trial includes it for ${daysLeft} more ${daysLeft === 1 ? "day" : "days"}. After the trial, on Basic, connections pause: data already fetched is kept, but nothing new is fetched.`;
}

// Whether the signed-in user can connect Search Console here (a Pro or trial owner on a configured deployment). Only
// then does the step's intro say it can also be connected later in Settings. An existing connection doesn't matter:
// the intro is about what the owner could do.
export function canConnectSearchConsole(input: {
  configured: boolean;
  hasBusiness: boolean;
  canConnectHere: boolean;
  role: string | null | undefined;
  allowed: boolean;
}): boolean {
  return searchConsoleCardState({ ...input, connection: null }) === "connectable";
}

// At most one line under the step's intro. Basic gets its paused notice inside the Search Console card instead, and
// paid Pro or Premium needs no line. When the connection isn't set up for this deployment, nothing can be connected,
// so no line talks about connecting.
export function connectPlanLine(input: {
  configured: boolean;
  canConnectHere: boolean;
  role: string | null | undefined;
  org: { plan: string; trial_ends_at: string | Date } | null;
  now?: Date;
}): string | null {
  if (!input.configured) return null;
  if (!input.canConnectHere) return OTHER_BUSINESS_LINE;
  if (!can(input.role, "integrations.connect")) return NON_OWNER_LINE;
  const trial = input.org ? effectiveAccess(input.org, input.now).trial : null;
  return trial?.active ? trialLine(trial.daysLeft) : null;
}
