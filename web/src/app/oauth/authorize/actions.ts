"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { decideConsent } from "@/lib/oauth/consent";
import type { AuthorizeParams } from "@/lib/oauth/authorize-request";
import { AUTHORIZE_PARAM_KEYS, originFromHeaders } from "@/lib/oauth/request-origin";
import { findClient, supabaseOAuthStore } from "@/lib/oauth/supabase-store";
import { CONSENT_REQUIRED, consentGiven } from "@/lib/legal/documents";
import { recordAcceptance } from "@/lib/legal/acceptances";

export type ConsentState = { error?: string } | undefined;

// Approve or cancel on /oauth/authorize. Everything is re-validated here; the organization must be one the signed-in
// user belongs to (memberships read through RLS). The code is written with the service client, scoped to that org.
export async function decideAuthorization(_: ConsentState, formData: FormData): Promise<ConsentState> {
  const user = await requireUser();
  const params: AuthorizeParams = {};
  for (const key of AUTHORIZE_PARAM_KEYS) {
    const v = formData.get(key);
    if (typeof v === "string" && v) params[key] = v;
  }
  const decision = formData.get("decision") === "approve" ? "approve" : "deny";
  const organizationId = String(formData.get("organizationId") ?? "") || null;
  // D-057, Terms §3: approving needs the checkbox; cancelling doesn't.
  if (decision === "approve" && !consentGiven(formData)) return { error: CONSENT_REQUIRED.assistant_oauth };

  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase.from("memberships").select("organization_id").eq("user_id", user.id);
  const admin = createSupabaseAdminClient();
  const result = await decideConsent(supabaseOAuthStore(admin), {
    params,
    client: await findClient(admin, params.client_id),
    origin: await originFromHeaders(),
    userId: user.id,
    decision,
    organizationId,
    memberOf: (memberships ?? []).map((m) => m.organization_id as string),
  });
  if (result.kind === "show-error") return { error: result.message };
  // Only an approval that issued a code (decideConsent checked the client and that the user belongs to the business).
  if (decision === "approve" && new URL(result.url).searchParams.has("code")) {
    await recordAcceptance({ userId: user.id, organizationId, context: "assistant_oauth", subject: params.client_id ?? null });
  }
  redirect(result.url);
}
