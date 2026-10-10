// Where an onboarding session continues (ON-6): the owner can leave at any step and come back to it.

export type SessionStatus = "discovering" | "reviewing" | "following_up" | "completed" | "skipped";

export const OPEN_STATUSES: SessionStatus[] = ["discovering", "reviewing", "following_up"];

export function isOpen(status: string | null | undefined) {
  return OPEN_STATUSES.includes(status as SessionStatus);
}

export function onboardingPath(session: { id: string; status: string; business_profile_id: string }) {
  switch (session.status) {
    case "discovering":
      return `/onboarding/${session.id}`;
    case "reviewing":
      return `/onboarding/${session.id}/review`;
    case "following_up":
      return `/onboarding/${session.id}/questions`;
    default:
      return `/analysis/${session.business_profile_id}`;
  }
}

// What the "continue" button says for each open step.
export function continueLabel(status: string) {
  return status === "reviewing"
    ? "Confirm your priorities"
    : status === "following_up"
      ? "Answer a few more questions"
      : "Answer the questions";
}
