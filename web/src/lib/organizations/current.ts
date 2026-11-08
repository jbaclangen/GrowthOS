import "server-only";
import { cookies } from "next/headers";

// The business the signed-in person chose to work on (D-062): an organization id in a cookie, set by the business
// switcher (app/settings/business-actions.ts), by starting a new business and by joining one from an invite. It is a
// preference, not an authorisation: lib/memberships.ts uses it only when the person is a member of that business, and
// falls back to their oldest membership otherwise (a removed business, a cookie from another account on the same
// browser).

export const BUSINESS_COOKIE = "brv_business";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isOrganizationId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

export async function chosenBusinessId(): Promise<string | null> {
  const value = (await cookies()).get(BUSINESS_COOKIE)?.value;
  return isOrganizationId(value) ? value : null;
}

// Only from a server action or a route handler (Next can't set cookies while rendering).
export async function rememberBusiness(organizationId: string) {
  (await cookies()).set(BUSINESS_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}
