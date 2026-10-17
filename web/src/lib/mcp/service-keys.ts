import type { SupabaseClient } from "@supabase/supabase-js";

// Service keys (brv_sk_…) in Settings → Integrations, read through the owner's client. RLS returns the service keys of
// every business the user owns, so each read is scoped to the business being managed. Unit-tested.

export const MAX_ACTIVE_SERVICE_KEYS = 10;

export type ServiceKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

export const hasExpired = (expiresAt: string | null, now = new Date()) => Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());

// Active: not revoked and not expired. Only active keys count toward the limit, since an expired key can't be used.
export const isActiveServiceKey = (k: Pick<ServiceKeyRow, "revoked_at" | "expires_at">, now = new Date()) =>
  !k.revoked_at && !hasExpired(k.expires_at, now);

export async function listServiceKeys(db: SupabaseClient, organizationId: string): Promise<ServiceKeyRow[]> {
  const { data } = await db
    .from("mcp_access_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at")
    .eq("organization_id", organizationId)
    .eq("kind", "service")
    .order("created_at", { ascending: false });
  return (data ?? []) as ServiceKeyRow[];
}

export async function countActiveServiceKeys(db: SupabaseClient, organizationId: string, now = new Date()) {
  const { data } = await db
    .from("mcp_access_keys")
    .select("revoked_at, expires_at")
    .eq("organization_id", organizationId)
    .eq("kind", "service")
    .is("revoked_at", null);
  return ((data ?? []) as Pick<ServiceKeyRow, "revoked_at" | "expires_at">[]).filter((k) => isActiveServiceKey(k, now)).length;
}
