// Where an onboarding session continues (ON-6): the owner can leave at any step and come back to it.

export type SessionStatus = "discovering" | "reviewing" | "following_up" | "completed" | "skipped";

// Setup steps shown to the owner: analyze, discovery, confirm priorities, connect your tools, follow-up questions.
// "Connect your tools" has no status of its own: following_up with no pending question means it comes next.
export const ONBOARDING_STEP_COUNT = 5;

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

// following_up covers two pages (D-054): "Connect your tools" until a round of follow-up questions is waiting, then the
// questions. The connect step's Continue generates a round only when none is waiting, so a repeat (the back button,
// a second tab) never adds another round on top of a pending one.
export function followUpStep(pendingCount: number): "connect" | "questions" {
  return pendingCount > 0 ? "questions" : "connect";
}

export function followUpPath(sessionId: string, pendingCount: number) {
  return `/onboarding/${sessionId}/${followUpStep(pendingCount)}`;
}

// What the "continue" button says for each open step. following_up can resume on either "Connect your tools" or the
// follow-up questions, so its label names neither.
export function continueLabel(status: string) {
  return status === "reviewing"
    ? "Confirm your priorities"
    : status === "following_up"
      ? "Continue setup"
      : "Answer the questions";
}
