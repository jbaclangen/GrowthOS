import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "./secret-box";
import { revokeToken } from "./google-oauth";

// The Google connection (founder decision 2026-11-08): one consent screen covers Google Search Console and Google
// Analytics 4. Each granted product gets its own integration_connections row holding the same refresh token,
// encrypted separately, so each keeps its own property, status and refresh guard. Revoking the token at Google ends
// both products, so a reconnect replaces both rows and a disconnect clears both. Every function takes an
// organization id the caller has already authorised; `db` is the service client.

export type GoogleProvider = "google_search_console" | "google_analytics";
export const GOOGLE_PROVIDERS: readonly GoogleProvider[] = ["google_search_console", "google_analytics"];

// Each product's snapshots, deleted with the connection.
export const SNAPSHOT_TABLES: Record<GoogleProvider, string> = {
  google_search_console: "search_console_snapshots",
  google_analytics: "analytics_snapshots",
};

type Db = SupabaseClient;

async function revokeStored(ciphertexts: (string | null | undefined)[]) {
  const tokens = new Set<string>();
  for (const c of ciphertexts) {
    if (!c) continue;
    try {
      tokens.add(decryptSecret(c));
    } catch {
      // Unreadable old token (key changed): nothing to revoke from here.
    }
  }
  await Promise.all([...tokens].map((t) => revokeToken(t)));
}

// Stores the connection after the OAuth callback: one row per granted product, replacing what was there, and the
// products the owner didn't grant this time are cleared. Old tokens are revoked only when they belong to another
// Google account: Google keeps one grant per account and client, so revoking an old token of the same account could
// also end the new one (the old token is overwritten instead, and Google retires old refresh tokens itself).
export async function saveGoogleConnection(
  db: Db,
  c: { organizationId: string; userId: string; email: string | null; scopes: string[]; refreshToken: string; granted: GoogleProvider[] },
) {
  const { data: existing } = await db
    .from("integration_connections")
    .select("id, provider, refresh_token_ciphertext, google_account_email")
    .eq("organization_id", c.organizationId)
    .in("provider", GOOGLE_PROVIDERS as GoogleProvider[]);
  const rows = (existing ?? []) as { id: string; provider: GoogleProvider; refresh_token_ciphertext: string | null; google_account_email: string | null }[];
  await revokeStored(rows.filter((r) => r.google_account_email && r.google_account_email !== c.email).map((r) => r.refresh_token_ciphertext));

  for (const provider of GOOGLE_PROVIDERS) {
    const old = rows.find((r) => r.provider === provider);
    if (!c.granted.includes(provider)) {
      if (old) await clearConnection(db, c.organizationId, provider, old.id);
      continue;
    }
    // Another Google account means other data: drop the old snapshots.
    if (old && old.google_account_email !== c.email) {
      await db.from(SNAPSHOT_TABLES[provider]).delete().eq("organization_id", c.organizationId);
    }
    const { error } = await db.from("integration_connections").upsert(
      {
        organization_id: c.organizationId,
        provider,
        connected_by: c.userId,
        google_account_email: c.email,
        refresh_token_ciphertext: encryptSecret(c.refreshToken),
        scopes: c.scopes,
        available_properties: [],
        property_labels: {},
        selected_property: null,
        status: "active",
        last_error: null,
        last_attempted_at: null,
      },
      { onConflict: "organization_id,provider" },
    );
    if (error) throw new Error("The Google connection wasn't saved.");
  }
}

async function clearConnection(db: Db, organizationId: string, provider: GoogleProvider, id: string) {
  const { error: snapError } = await db.from(SNAPSHOT_TABLES[provider]).delete().eq("organization_id", organizationId);
  const { error } = await db
    .from("integration_connections")
    .update({
      refresh_token_ciphertext: null,
      status: "revoked",
      google_account_email: null,
      scopes: [],
      available_properties: [],
      property_labels: {},
      selected_property: null,
      last_error: null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error || snapError) throw new Error("Google wasn't fully disconnected. Try again.");
}

// Revokes Braventa's access at Google and clears both products: tokens, properties and every snapshot.
export async function disconnectGoogle(db: Db, organizationId: string) {
  const { data } = await db
    .from("integration_connections")
    .select("id, provider, refresh_token_ciphertext")
    .eq("organization_id", organizationId)
    .in("provider", GOOGLE_PROVIDERS as GoogleProvider[]);
  const rows = (data ?? []) as { id: string; provider: GoogleProvider; refresh_token_ciphertext: string | null }[];
  // Unreadable tokens: deleting them below still cuts Braventa off; the owner can also remove access in Google.
  await revokeStored(rows.map((r) => r.refresh_token_ciphertext));
  for (const r of rows) await clearConnection(db, organizationId, r.provider, r.id);
}
