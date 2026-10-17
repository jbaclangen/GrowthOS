"use server";

import { refresh } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { generateSecret, sha256Hex } from "@/lib/oauth/tokens";

// Settings → Integrations: service keys (owner-only, through RLS) and disconnecting OAuth-connected apps.

const MAX_ACTIVE_SERVICE_KEYS = 10;
const EXPIRY_DAYS = new Set([30, 90, 365]);

export type CreateServiceKeyState = { error?: string; key?: string; name?: string } | undefined;

// What the service-key list shows, e.g. "brv_sk_Ab3dE…".
const servicePrefix = (key: string) => key.slice(0, 12);

export async function createServiceKey(_: CreateServiceKeyState, formData: FormData): Promise<CreateServiceKeyState> {
  await requireUser();
  const org = await getCurrentOrg();
  if (!org) return { error: "Set up your business first." };
  if (org.role !== "owner") return { error: "Only the business owner can create service keys." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: 'Name the key after what uses it, for example "n8n onboarding workflow".' };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };
  const expiry = String(formData.get("expiry") ?? "never");
  const days = Number(expiry);
  if (expiry !== "never" && !EXPIRY_DAYS.has(days)) return { error: "Choose when the key expires." };
  const expiresAt = expiry === "never" ? null : new Date(Date.now() + days * 86_400_000).toISOString();

  // RLS lets only owners read and add service keys for their organization.
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("mcp_access_keys")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("kind", "service")
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_ACTIVE_SERVICE_KEYS) {
    return { error: `You can have up to ${MAX_ACTIVE_SERVICE_KEYS} active service keys. Revoke one first.` };
  }

  const key = generateSecret("service");
  const { error } = await supabase.from("mcp_access_keys").insert({
    organization_id: org.id,
    kind: "service",
    name,
    key_prefix: servicePrefix(key),
    key_hash: sha256Hex(key),
    expires_at: expiresAt,
  });
  if (error) return { error: "The service key wasn't created. Try again." };
  refresh();
  // Shown once; only the hash is stored.
  return { key, name };
}

export async function revokeServiceKey(keyId: string) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("mcp_access_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("kind", "service")
    .is("revoked_at", null);
  if (error) throw new Error("The service key wasn't revoked. Try again.");
  refresh();
}

// Disconnects an app that signed in with OAuth: revokes the grant and every token in it. The person who connected
// it, or an owner of the business, may disconnect. The grant is read through RLS first; the service client then
// writes only rows of that grant and organization.
export async function disconnectApp(grantId: string) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: grant } = await supabase.from("oauth_grants").select("id, organization_id, user_id").eq("id", grantId).maybeSingle();
  if (!grant) throw new Error("That connection wasn't found.");
  if (grant.user_id !== user.id) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", grant.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership?.role !== "owner") throw new Error("Only the person who connected this app or the business owner can disconnect it.");
  }
  const at = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  await admin
    .from("oauth_grants")
    .update({ revoked_at: at, revoked_reason: "user" })
    .eq("id", grant.id)
    .eq("organization_id", grant.organization_id)
    .is("revoked_at", null);
  await admin
    .from("oauth_tokens")
    .update({ revoked_at: at })
    .eq("grant_id", grant.id)
    .eq("organization_id", grant.organization_id)
    .is("revoked_at", null);
  refresh();
}
