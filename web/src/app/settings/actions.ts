"use server";

import { refresh } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayPrefix, generateKey, hashKey } from "@/lib/mcp/keys";

// Personal access keys for the AI assistant connection (MCP, D-036). Writes go through the signed-in user's
// client: RLS and column grants only let owners add and revoke their own keys, and never read the hash.

const MAX_ACTIVE_KEYS = 5;

export type CreateKeyState = { error?: string; key?: string; name?: string } | undefined;

export async function createAccessKey(_: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the key, for example \"Claude Desktop on my laptop\"." };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };

  const org = await getCurrentOrg();
  if (!org) return { error: "Analyze a website first so we know which business this key is for." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("mcp_access_keys")
    .select("id", { count: "exact", head: true })
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) return { error: `You can have up to ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` };

  const key = generateKey();
  const { error } = await supabase
    .from("mcp_access_keys")
    .insert({ organization_id: org.id, name, key_prefix: displayPrefix(key), key_hash: hashKey(key) });
  if (error) return { error: "The key wasn't created. Try again." };
  refresh();
  // Shown once; only the hash is stored.
  return { key, name };
}

export async function revokeAccessKey(keyId: string) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("mcp_access_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .is("revoked_at", null);
  if (error) throw new Error("The key wasn't revoked. Try again.");
  refresh();
}
