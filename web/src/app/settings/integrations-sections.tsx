import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SCOPES, type Scope } from "@/lib/oauth/scopes";
import { disconnectApp, revokeServiceKey } from "./integrations-actions";
import { ServiceKeyForm } from "./service-key-form";

// Settings → Integrations: apps connected with "Sign in with Braventa" (OAuth grants) and service keys. Reads go
// through the signed-in user's client: RLS and column grants apply, so no token or key hash is ever selected.

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const fmt = (d: string) => dateFormat.format(new Date(d));
const hasExpired = (d: string | null) => Boolean(d && new Date(d).getTime() <= Date.now());
const scopeLabel = (s: string) => (s in SCOPES ? SCOPES[s as Scope].label : s);

type Grant = { id: string; organization_id: string; user_id: string; client_name: string; scopes: string[]; created_at: string; last_used_at: string | null };

export async function ConnectedApps({ userId, orgNames, ownerOf }: { userId: string; orgNames: Map<string, string>; ownerOf: Set<string> }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("oauth_grants")
    .select("id, organization_id, user_id, client_name, scopes, created_at, last_used_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  const grants = (data ?? []) as Grant[];
  const ids = grants.map((g) => g.id);
  // A grant stays usable while it has an unexpired refresh token (30 days, renewed on every refresh).
  const { data: live } = ids.length
    ? await supabase
        .from("oauth_tokens")
        .select("grant_id")
        .in("grant_id", ids)
        .eq("kind", "refresh")
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
    : { data: [] };
  const active = new Set((live ?? []).map((t) => t.grant_id as string));

  return (
    <section id="connected-apps" className="card mt-6 scroll-mt-20" aria-labelledby="connected-apps-heading">
      <h3 id="connected-apps-heading" className="text-lg font-semibold">
        Connected apps
      </h3>
      <p className="mt-1 text-sm text-muted">
        Apps you or your team approved with &quot;Sign in with Braventa&quot;, such as Claude or ChatGPT. Disconnecting stops
        them right away; to use one again, connect it from the app.
      </p>
      {grants.length === 0 ? (
        <p className="mt-4 text-sm">No apps are connected yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border text-sm">
          {grants.map((g) => {
            const canDisconnect = g.user_id === userId || ownerOf.has(g.organization_id);
            return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {g.client_name}{" "}
                    {!active.has(g.id) && <span className="chip bg-surface-muted text-muted">Signed out</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {orgNames.get(g.organization_id) ?? "Business"} · {g.scopes.map(scopeLabel).join(", ")}
                  </p>
                  <p className="text-xs text-muted">
                    Connected {fmt(g.created_at)}
                    {g.user_id === userId ? " by you" : ""} · {g.last_used_at ? `Last used ${fmt(g.last_used_at)}` : "Not used yet"}
                  </p>
                </div>
                {canDisconnect && (
                  <form action={disconnectApp.bind(null, g.id)}>
                    <button type="submit" className="btn-secondary">
                      Disconnect
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type ServiceKey = { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null; expires_at: string | null };

export async function ServiceKeys({ isOwner, serverUrl }: { isOwner: boolean; serverUrl: string }) {
  if (!isOwner) {
    return (
      <section id="service-keys" className="card mt-6 scroll-mt-20" aria-labelledby="service-keys-heading">
        <h3 id="service-keys-heading" className="text-lg font-semibold">
          Service keys
        </h3>
        <p className="mt-2 text-sm text-muted">Only the business owner can create and manage service keys.</p>
      </section>
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("mcp_access_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at")
    .eq("kind", "service")
    .order("created_at", { ascending: false });
  const keys = (data ?? []) as ServiceKey[];

  return (
    <section id="service-keys" className="card mt-6 scroll-mt-20" aria-labelledby="service-keys-heading">
      <h3 id="service-keys-heading" className="text-lg font-semibold">
        Service keys
      </h3>
      <p className="mt-1 text-sm text-muted">
        For automation tools and scripts (n8n, Zapier, your own code) that use Braventa&apos;s MCP server without a person
        signing in. A service key belongs to the business, not to you, and can do the same setup and status steps as your AI
        assistant. Treat it like a password.
      </p>
      <ServiceKeyForm serverUrl={serverUrl} />
      {keys.length > 0 && (
        <ul className="mt-6 divide-y divide-border text-sm">
          {keys.map((k) => {
            const expired = hasExpired(k.expires_at);
            return (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">
                    {k.name} <span className="font-normal text-muted">({k.key_prefix}…)</span>
                  </p>
                  <p className="text-xs text-muted">
                    Created {fmt(k.created_at)} ·{" "}
                    {k.revoked_at
                      ? `Revoked ${fmt(k.revoked_at)}`
                      : expired
                        ? `Expired ${fmt(k.expires_at!)}`
                        : `${k.last_used_at ? `Last used ${fmt(k.last_used_at)}` : "Not used yet"} · ${k.expires_at ? `Expires ${fmt(k.expires_at)}` : "Doesn't expire"}`}
                  </p>
                </div>
                {!k.revoked_at && !expired && (
                  <form action={revokeServiceKey.bind(null, k.id)}>
                    <button type="submit" className="btn-secondary">
                      Revoke
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
