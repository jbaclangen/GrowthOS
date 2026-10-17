"use server";

import { refresh } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayPrefix, generateKey, hashKey } from "@/lib/mcp/keys";

// Personal access keys for the AI assistant connection (MCP, D-036). Writes go through the signed-in user's
// client: RLS and column grants only let owners add and revoke their own keys, and never read the hash.

const MAX_ACTIVE_KEYS = 5;

export type CreateKeyState = { error?: string; key?: string; name?: string; prefix?: string } | undefined;

export async function createAccessKey(_: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the key, for example \"Claude Desktop on my laptop\"." };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };

  const supabase = await createSupabaseServerClient();
  let org = await getCurrentOrg();
  if (!org) {
    // New accounts can start from their AI assistant (D-036): the key needs an organization, so create it here,
    // the same way the first website analysis does. The trial starts now.
    const businessName = String(formData.get("businessName") ?? "").trim();
    if (!businessName) return { error: "Enter your business name so we know which business this key is for." };
    if (businessName.length > 120) return { error: "Keep the business name under 120 characters." };
    const { data: orgId, error } = await supabase.rpc("create_organization", { org_name: businessName });
    if (error || !orgId) return { error: "Your business wasn't created. Try again." };
    org = { id: orgId as string, name: businessName, role: "owner" };
  }

  const { count } = await supabase
    .from("mcp_access_keys")
    .select("id", { count: "exact", head: true })
    .eq("kind", "personal")
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) return { error: `You can have up to ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` };

  const key = generateKey();
  const { error } = await supabase
    .from("mcp_access_keys")
    .insert({ organization_id: org.id, name, key_prefix: displayPrefix(key), key_hash: hashKey(key) });
  if (error) return { error: "The key wasn't created. Try again." };
  refresh();
  // Shown once; only the hash is stored.
  return { key, name, prefix: displayPrefix(key) };
}

// The setup check: has Braventa received a request with this key yet? RLS limits it to the user's own keys.
export async function keyLastUsed(prefix: string): Promise<string | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("mcp_access_keys")
    .select("last_used_at")
    .eq("kind", "personal")
    .eq("key_prefix", prefix)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.last_used_at ?? null;
}

export async function revokeAccessKey(keyId: string) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("mcp_access_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("kind", "personal")
    .is("revoked_at", null);
  if (error) throw new Error("The key wasn't revoked. Try again.");
  refresh();
}
