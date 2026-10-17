// Where to send someone after signing in (?next=…). Only same-site paths: no scheme, no "//host" and no "/\host",
// which browsers also read as another host. Pure, unit-tested.
export const MAX_NEXT_LENGTH = 2000;

export function safeNext(next: unknown, fallback = "/dashboard") {
  if (typeof next !== "string" || next.length > MAX_NEXT_LENGTH) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
