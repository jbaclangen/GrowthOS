import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { AuthMethod } from "./clients";
import type { CodeRow, GrantRow, OAuthStore, TokenRow } from "./grants";
import { safeEqual, sha256Hex } from "./tokens";

// The OAuth tables through the service client (they have no client write policies). Every write is keyed by a
// hash or id the caller resolved from a verified secret, so nothing here takes an organization id from a request.

export type StoredClient = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  token_endpoint_auth_method: AuthMethod;
  client_secret_hash: string | null;
};

export function supabaseOAuthStore(db: SupabaseClient): OAuthStore {
  return {
    async insertCode(row) {
      const { error } = await db.from("oauth_authorization_codes").insert(row);
      if (error) throw new Error(`oauth code insert failed: ${error.message}`);
    },
    async consumeCode(codeHash, now) {
      const { data } = await db
        .from("oauth_authorization_codes")
        .update({ used_at: now.toISOString() })
        .eq("code_hash", codeHash)
        .is("used_at", null)
        .select("*")
        .maybeSingle();
      if (data) return { code: data as CodeRow, firstUse: true };
      const { data: used } = await db.from("oauth_authorization_codes").select("*").eq("code_hash", codeHash).maybeSingle();
      return used ? { code: used as CodeRow, firstUse: false } : null;
    },
    async createGrant(row) {
      const { error } = await db.from("oauth_grants").insert(row);
      if (error) throw new Error(`oauth grant insert failed: ${error.message}`);
    },
    async findGrant(id) {
      const { data } = await db
        .from("oauth_grants")
        .select("id, organization_id, user_id, client_id, client_name, scopes, resource, revoked_at")
        .eq("id", id)
        .maybeSingle();
      return (data as GrantRow | null) ?? null;
    },
    async revokeGrant(id, reason, now) {
      const at = now.toISOString();
      await db.from("oauth_grants").update({ revoked_at: at, revoked_reason: reason }).eq("id", id).is("revoked_at", null);
      await db.from("oauth_tokens").update({ revoked_at: at }).eq("grant_id", id).is("revoked_at", null);
    },
    async insertTokens(rows) {
      const { error } = await db.from("oauth_tokens").insert(rows);
      if (error) throw new Error(`oauth token insert failed: ${error.message}`);
    },
    async findToken(tokenHash) {
      const { data } = await db.from("oauth_tokens").select("*").eq("token_hash", tokenHash).maybeSingle();
      return (data as TokenRow | null) ?? null;
    },
    async consumeRefreshToken(tokenHash, now) {
      const { data } = await db
        .from("oauth_tokens")
        .update({ revoked_at: now.toISOString(), last_used_at: now.toISOString() })
        .eq("token_hash", tokenHash)
        .eq("kind", "refresh")
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();
      if (data) return { firstUse: true };
      const { data: existing } = await db.from("oauth_tokens").select("id").eq("token_hash", tokenHash).maybeSingle();
      return existing ? { firstUse: false } : null;
    },
    async revokeToken(tokenHash, now) {
      await db.from("oauth_tokens").update({ revoked_at: now.toISOString() }).eq("token_hash", tokenHash).is("revoked_at", null);
    },
    async isMember(organizationId, userId) {
      const { data } = await db
        .from("memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();
      return Boolean(data);
    },
  };
}

export async function findClient(db: SupabaseClient, clientId: string | null | undefined): Promise<StoredClient | null> {
  if (!clientId || !/^brv_client_[A-Za-z0-9_-]{22,64}$/.test(clientId)) return null;
  const { data } = await db
    .from("oauth_clients")
    .select("client_id, client_name, redirect_uris, token_endpoint_auth_method, client_secret_hash")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data as StoredClient | null) ?? null;
}

// Client authentication at the token and revocation endpoints: public clients send only client_id; confidential
// clients send their secret in the body (client_secret_post) or in HTTP Basic (client_secret_basic).
export async function authenticateClient(db: SupabaseClient, form: URLSearchParams, authorization: string | null): Promise<StoredClient | null> {
  let clientId = form.get("client_id");
  let secret = form.get("client_secret");
  const basic = authorization?.match(/^Basic\s+(\S+)$/i);
  if (basic) {
    const decoded = Buffer.from(basic[1], "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i > 0) {
      clientId = decodeURIComponent(decoded.slice(0, i));
      secret = decodeURIComponent(decoded.slice(i + 1));
    }
  }
  const client = await findClient(db, clientId);
  if (!client) return null;
  if (client.token_endpoint_auth_method === "none") return client;
  if (!secret || !client.client_secret_hash) return null;
  return safeEqual(sha256Hex(secret), client.client_secret_hash) ? client : null;
}

// Rate-limit identity for client registration: an HMAC of the IP with a key derived from a server secret, so the IP
// itself is never stored (same approach as the contact form). Vercel sets x-forwarded-for; the first entry is the client.
export function registrationIpHash(headers: Headers) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
  if (!ip) return null;
  const key = createHmac("sha256", env().SUPABASE_SECRET_KEY).update("braventa-oauth-registration-ip").digest();
  return createHmac("sha256", key).update(`ip:${ip}`).digest("hex");
}
