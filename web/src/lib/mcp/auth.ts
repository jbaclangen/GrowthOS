import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerFromHeader, classifyBearer, sha256Hex } from "@/lib/oauth/tokens";
import { AUTH_MESSAGES, resolveAccessToken, type ResolvedPrincipal } from "./principal";

// Resolves the bearer credential on an /api/mcp request: a personal access key (brv_…), a service key (brv_sk_…) or
// an OAuth access token (brv_at_…). Uses the service client; the result's organizationId is the only organization
// the request may touch. Pure rules live in ./principal.ts (unit-tested).

export type Org = { plan: string; trial_ends_at: string };

export async function authenticateMcp(db: SupabaseClient, header: string | null, resource: string, now = new Date()): Promise<ResolvedPrincipal> {
  const value = bearerFromHeader(header);
  if (!value) return { ok: false, reason: "missing" };
  const kind = classifyBearer(value);
  if (!kind) return { ok: false, reason: "invalid", message: AUTH_MESSAGES.malformed };
  const hash = sha256Hex(value);

  if (kind === "personal" || kind === "service") {
    const { data: row } = await db
      .from("mcp_access_keys")
      .select("id, kind, organization_id, user_id, scopes, expires_at, revoked_at, organizations(plan, trial_ends_at)")
      .eq("key_hash", hash)
      .maybeSingle();
    if (!row || row.kind !== kind || row.revoked_at) {
      return { ok: false, reason: "invalid", message: AUTH_MESSAGES.keyInvalid };
    }
    if (row.expires_at && new Date(row.expires_at as string).getTime() <= now.getTime()) {
      return { ok: false, reason: "invalid", message: AUTH_MESSAGES.serviceKeyExpired };
    }
    if (kind === "personal") {
      // The key's owner must still belong to the organization.
      const { data: membership } = await db
        .from("memberships")
        .select("user_id")
        .eq("organization_id", row.organization_id)
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (!membership) return { ok: false, reason: "invalid", message: AUTH_MESSAGES.keyOwnerLeft };
    }
    await db.from("mcp_access_keys").update({ last_used_at: now.toISOString() }).eq("id", row.id);
    return {
      ok: true,
      principal: {
        kind,
        organizationId: row.organization_id as string,
        userId: (row.user_id as string | null) ?? null,
        keyId: row.id as string,
        grantId: null,
        scopes: row.scopes as string[],
        org: row.organizations as unknown as Org,
      },
    };
  }

  // OAuth access token.
  const { data: token } = await db
    .from("oauth_tokens")
    .select("id, kind, organization_id, user_id, grant_id, scopes, resource, expires_at, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  const { data: grant } = token
    ? await db.from("oauth_grants").select("id, revoked_at").eq("id", token.grant_id).maybeSingle()
    : { data: null };
  const { data: membership } = token
    ? await db.from("memberships").select("user_id").eq("organization_id", token.organization_id).eq("user_id", token.user_id).maybeSingle()
    : { data: null };
  const resolved = resolveAccessToken(token, grant, Boolean(membership), resource, now);
  if (!resolved.ok) return resolved;

  const { data: org } = await db.from("organizations").select("plan, trial_ends_at").eq("id", resolved.principal.organizationId).maybeSingle();
  if (!org) return { ok: false, reason: "invalid", message: AUTH_MESSAGES.orgGone };
  await Promise.all([
    db.from("oauth_tokens").update({ last_used_at: now.toISOString() }).eq("id", token!.id),
    db.from("oauth_grants").update({ last_used_at: now.toISOString() }).eq("id", resolved.principal.grantId),
  ]);
  return { ok: true, principal: { ...resolved.principal, org: org as Org } };
}
