import type { SupabaseClient } from "@supabase/supabase-js";

// Creates a business owned by the signed-in person through create_organization() (D-062), which refuses one past the
// account's business limit with SQLSTATE BRV01 and picks the new business's plan and trial
// (supabase/migrations/20261108103906_business_limits.sql). The client must be the user's own (auth.uid()).

export const BUSINESS_LIMIT_SQLSTATE = "BRV01";

export type CreateBusinessResult = { id: string } | { error: string; atLimit: boolean };

export const AT_LIMIT_MESSAGE =
  "Your account already has as many businesses as its plan includes. Move to a higher plan to add more, or remove a business you no longer need.";

export async function createBusiness(db: SupabaseClient, name: string, limitMessage = AT_LIMIT_MESSAGE): Promise<CreateBusinessResult> {
  const { data, error } = await db.rpc("create_organization", { org_name: name });
  if (error?.code === BUSINESS_LIMIT_SQLSTATE) return { error: limitMessage, atLimit: true };
  if (error || typeof data !== "string") return { error: "Your business wasn't created. Try again.", atLimit: false };
  return { id: data };
}
