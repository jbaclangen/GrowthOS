// Display helpers for Search Console numbers (US English).
const int = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export const formatInt = (n: number) => int.format(Math.round(n));
export const formatCtr = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
export const formatPosition = (p: number) => (p ? p.toFixed(1) : "–");
export const formatDay = (iso: string) => date.format(new Date(`${iso}T00:00:00Z`));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// "+12.5% vs previous 28 days", or null when there's nothing to compare.
export function formatChange(change: number | null) {
  if (change === null) return null;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

// Page URLs shown as paths within the property.
export function shortPage(url: string) {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return url;
  }
}
