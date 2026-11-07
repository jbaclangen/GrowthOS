import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { CONTEXT_DOCUMENTS, LEGAL_VERSION, type AcceptanceContext } from "./documents";

// Writes and reads legal_acceptances (D-057). Writes use the secret key so the time and version can't be forged; the
// caller has already authenticated the user (and, for an organization, authorized them for it). Recording never blocks
// the step it belongs to: the checkbox is enforced before this runs, and a failed write is logged, so the app keeps
// working if the migration isn't applied yet (the banner then asks again).

export async function recordAcceptance(a: {
  userId: string;
  context: AcceptanceContext;
  organizationId?: string | null;
  subject?: string | null;
}): Promise<boolean> {
  const { error } = await createSupabaseAdminClient()
    .from("legal_acceptances")
    .insert({
      user_id: a.userId,
      organization_id: a.organizationId ?? null,
      context: a.context,
      documents_version: LEGAL_VERSION,
      documents: CONTEXT_DOCUMENTS[a.context],
      subject: a.subject ? a.subject.slice(0, 2048) : null,
    });
  if (error) console.error(`legal_acceptances: recording ${a.context} failed:`, error.message);
  return !error;
}

// Has this user accepted the current version of the core documents (at sign-up or through the banner)? Read with the
// user's own client (RLS: own rows). On a read error it answers true, so a missing table never locks anyone out.
export async function hasAcceptedCurrentTerms(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", userId)
    .in("context", ["signup", "terms_update"])
    .eq("documents_version", LEGAL_VERSION)
    .limit(1);
  if (error) {
    console.error("legal_acceptances: read failed:", error.message);
    return true;
  }
  return (data ?? []).length > 0;
}
