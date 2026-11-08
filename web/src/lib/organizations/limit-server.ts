import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownedOrganizations } from "@/lib/memberships";
import { businessUsage, limitMessage, type BusinessUsage } from "@/lib/plans/business-limit";
import { AT_LIMIT_MESSAGE, createBusiness, type CreateBusinessResult } from "./create";

// The signed-in user's business limit (D-062), read through their own client: the businesses they own and the plan
// that sets the limit. Null when the read fails; the database checks again in create_organization() either way.
export async function accountUsage(db: SupabaseClient, userId: string): Promise<BusinessUsage | null> {
  return ownedOrganizations(db, userId)
    .then((owned) => businessUsage(owned))
    .catch(() => null);
}

// create_organization() with the refusal worded from the account's own limit.
export async function createOwnedBusiness(db: SupabaseClient, userId: string, name: string): Promise<CreateBusinessResult> {
  const created = await createBusiness(db, name);
  if ("error" in created && created.atLimit) {
    const usage = await accountUsage(db, userId);
    return { error: usage ? limitMessage(usage) : AT_LIMIT_MESSAGE, atLimit: true };
  }
  return created;
}
