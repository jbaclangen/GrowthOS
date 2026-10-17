// Browser-side rules for "Ask Braventa" (D-042), kept out of the component so they're unit-tested: the keyboard
// shortcut and how the route's reply becomes an answer or a message (VOICE_AND_MESSAGING §12: what happened, then
// what to do).

export const CLIENT_ERRORS = {
  sessionEnded: "Your session has ended. Sign in again to use the assistant.",
  server: "Something went wrong on our side. Try again; if it keeps happening, contact us at braventa.io/contact.",
  failed: "The assistant couldn't answer just now. Try again in a minute.",
  offline: "Braventa couldn't be reached. Check your internet connection, then try again.",
} as const;

type ReplyLike = {
  ok: boolean;
  status: number;
  redirected: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};

// The route always answers JSON, 401 included. Anything else comes from the platform (a function timeout or crash
// page), which says nothing about the session, so only a 401 or a redirect to sign-in means "signed out".
export async function readAssistantReply(res: ReplyLike): Promise<{ answer: string } | { error: string }> {
  if (!res.headers.get("content-type")?.includes("application/json")) {
    return { error: res.status === 401 || res.redirected ? CLIENT_ERRORS.sessionEnded : CLIENT_ERRORS.server };
  }
  let data: { answer?: unknown; error?: unknown };
  try {
    data = ((await res.json()) ?? {}) as typeof data;
  } catch {
    return { error: CLIENT_ERRORS.server };
  }
  if (res.ok && typeof data.answer === "string" && data.answer) return { answer: data.answer };
  if (typeof data.error === "string" && data.error) return { error: data.error };
  return { error: res.ok ? CLIENT_ERRORS.failed : CLIENT_ERRORS.server };
}

// Cmd+K on Apple devices, Ctrl+K elsewhere. Never a single character (WCAG 2.1.4), and never Ctrl+K on a Mac,
// where text fields use it to delete to the end of the line.
export function isAssistantShortcut(
  e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean },
  apple: boolean,
): boolean {
  const modifier = apple ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  return modifier && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";
}

export function isApplePlatform(nav: { platform?: string; userAgent?: string; userAgentData?: { platform?: string } }): boolean {
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent || "");
}
