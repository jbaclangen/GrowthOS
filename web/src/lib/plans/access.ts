import "server-only";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstOrganization } from "@/lib/memberships";
import { effectiveAccess, type Access } from "./tiers";
import { hasSubscription } from "./subscription";

// The signed-in user's organization and its current tier (D-030). RLS also returns co-members' memberships (and every
// organization's for platform staff), so the read is filtered by the user's id (lib/memberships.ts).
// `subscribed`: an active trial or a plan (lib/plans/subscription.ts); gates the in-app assistant (D-043).
export async function getOrgAccess(userId: string): Promise<({ orgId: string; orgName: string; subscribed: boolean } & Access) | null> {
  // The trial depends on the current time, so this always renders at request time (Cache Components).
  await connection();
  const supabase = await createSupabaseServerClient();
  // A failed read shows as no organization, as it always has here.
  const org = await firstOrganization(supabase, userId).catch(() => null);
  if (!org) return null;
  return { orgId: org.id, orgName: org.name, subscribed: hasSubscription(org), ...effectiveAccess(org) };
}
