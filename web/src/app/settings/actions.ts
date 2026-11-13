"use server";

import { refresh } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayPrefix, generateKey, hashKey } from "@/lib/mcp/keys";
import { can, deniedMessage } from "@/lib/team/roles";
import { CONSENT_REQUIRED, consentGiven } from "@/lib/legal/documents";
import { recordAcceptance } from "@/lib/legal/acceptances";
import { createOwnedBusiness } from "@/lib/organizations/limit-server";
import { isOrganizationId, rememberBusiness } from "@/lib/organizations/current";

// Personal access keys for the AI assistant connection (MCP, D-036). Writes go through the signed-in user's
// client: RLS and column grants only let owners add and revoke their own keys, and never read the hash.

const MAX_ACTIVE_KEYS = 5;

export type CreateKeyState = { error?: string; key?: string; name?: string; prefix?: string } | undefined;

export async function createAccessKey(_: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the key, for example \"Claude Desktop on my laptop\"." };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };
  // D-057, Terms §3.
  if (!consentGiven(formData)) return { error: CONSENT_REQUIRED.access_key };

  const supabase = await createSupabaseServerClient();
  // The business the page showed (organizationId, D-062), never the cookie's: the user may have switched business in
  // another tab. Only a page without a business posts no id: it asks for a business name and sets that business up,
  // even if the user joined another business in another tab meanwhile. A form rendered before that (no id, no name)
  // falls back to the business the user is working on, as before.
  const posted = formData.get("organizationId");
  const namesNewBusiness = posted === null && String(formData.get("businessName") ?? "").trim() !== "";
  let org =
    posted === null
      ? namesNewBusiness
        ? null
        : await getCurrentOrg(user.id)
      : isOrganizationId(posted)
        ? await getCurrentOrg(user.id, posted)
        : null;
  if (!org && posted !== null) return { error: "This business wasn't found. Reload the page and try again." };
  if (!org) {
    // New accounts can start from their AI assistant (D-036): the key needs an organization, so create it here,
    // the same way the first website analysis does. The trial starts now.
    const businessName = String(formData.get("businessName") ?? "").trim();
    if (!businessName) return { error: "Enter your business name so we know which business this key is for." };
    if (businessName.length > 120) return { error: "Keep the business name under 120 characters." };
    // Nothing owned yet, so the limit (D-062) can't refuse it; create_organization checks anyway.
    const created = await createOwnedBusiness(supabase, user.id, businessName);
    if ("error" in created) return { error: created.error };
    org = { id: created.id, name: businessName, role: "owner" };
    await rememberBusiness(created.id);
  }
  // D-046: personal keys need keys.manage_own (not copywriters, content creators or analysts).
  if (!can(org.role, "keys.manage_own")) return { error: deniedMessage("keys.manage_own") };

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
  await recordAcceptance({ userId: user.id, organizationId: org.id, context: "access_key", subject: displayPrefix(key) });
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
