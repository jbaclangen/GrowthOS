import "server-only";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentOrganization } from "@/lib/memberships";
import { chosenBusinessId } from "@/lib/organizations/current";
import { effectiveAccess, type Access } from "./tiers";
import { hasSubscription } from "./subscription";

// The business the signed-in user is working on (lib/auth.ts getCurrentOrg: the one they chose, else their oldest)
// and its current tier (D-030). RLS also returns co-members' memberships (and every organization's for platform
// staff), so the read is filtered by the user's id (lib/memberships.ts).
// `subscribed`: an active trial or a plan (lib/plans/subscription.ts); gates the in-app assistant (D-043).
export async function getOrgAccess(userId: string): Promise<({ orgId: string; orgName: string; subscribed: boolean } & Access) | null> {
  // The trial depends on the current time, so this always renders at request time (Cache Components).
  await connection();
  const supabase = await createSupabaseServerClient();
  // A failed read shows as no organization, as it always has here.
  const org = await currentOrganization(supabase, userId, await chosenBusinessId()).catch(() => null);
  if (!org) return null;
  return { orgId: org.id, orgName: org.name, subscribed: hasSubscription(org), ...effectiveAccess(org) };
}
