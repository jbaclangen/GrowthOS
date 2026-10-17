import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mcpAccess } from "@/lib/mcp/access";
import { MCP_PATH } from "@/lib/oauth/server-metadata";
import { originFromHeaders } from "@/lib/oauth/request-origin";
import { revokeAccessKey } from "./actions";
import { KeyForm } from "./key-form";
import { ConnectionsSection } from "./connections-section";
import { ConnectInstructions } from "./connect-instructions";
import { ConnectedApps, ServiceKeys } from "./integrations-sections";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

async function Settings() {
  const user = await requireUser();
  const org = await getCurrentOrg();
  const supabase = await createSupabaseServerClient();
  const [{ data: keys }, { data: orgRow }, { data: memberships }] = await Promise.all([
    supabase
      .from("mcp_access_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("kind", "personal")
      .order("created_at", { ascending: false }),
    org
      ? supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("memberships").select("role, organizations(id, name)").eq("user_id", user.id),
  ]);
  const access = orgRow ? mcpAccess(orgRow) : null;
  const serverUrl = `${await originFromHeaders()}${MCP_PATH}`;
  const active = (keys ?? []).filter((k) => !k.revoked_at);
  const orgs = (memberships ?? []).map((m) => ({ role: m.role as string, org: m.organizations as unknown as { id: string; name: string } }));
  const orgNames = new Map(orgs.map((m) => [m.org.id, m.org.name]));
  const ownerOf = new Set(orgs.filter((m) => m.role === "owner").map((m) => m.org.id));

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div id="integrations" className="mt-8 scroll-mt-20">
        <h2 className="text-xl font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted">
          Connect your AI assistant, automation tools and Google Search Console to Braventa.
        </p>

        <section id="ai-assistant" className="card mt-4 scroll-mt-20" aria-labelledby="ai-access">
          <p className="eyebrow">AI assistant</p>
          <h3 id="ai-access" className="mt-1 text-lg font-semibold">
            Connect Claude or ChatGPT to Braventa
          </h3>
          <p className="mt-2 text-sm text-muted">
            If you&apos;ve already worked on your business with an AI assistant, it can answer Braventa&apos;s setup questions
            for you: your website, the problems holding the business back, your priorities and the follow-up questions. You
            still confirm the diagnosis and approve posts here in Braventa. Works with claude.ai, Claude Desktop, Claude Code
            and ChatGPT.
          </p>

          {access && !access.allowed && (
            <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
              Your free trial has ended, so the AI assistant connection is paused. It works again once you&apos;re on a
              plan.{" "}
              <Link href="/plans" className="underline">
                Choose a plan
              </Link>
            </p>
          )}

          <h4 className="mt-6 text-sm font-semibold">Sign in with Braventa (recommended)</h4>
          <p className="mt-1 text-sm text-muted">
            Add Braventa&apos;s server URL to your app. The app opens Braventa so you can sign in, choose the business and
            approve. No key to copy or keep safe.
          </p>
          {!org && (
            <p className="mt-2 text-sm">
              New to Braventa? Create an access key below first: it asks for your business name and sets up the business.
            </p>
          )}
          <ConnectInstructions serverUrl={serverUrl} />

          <details className="mt-6 rounded-md border border-border px-3 py-2" open={(keys ?? []).length > 0 || !org}>
            <summary className="cursor-pointer text-sm font-semibold">Use an access key instead (Claude Desktop config or Claude Code)</summary>
            <p className="mt-2 text-sm text-muted">
              A personal key you paste into the app&apos;s setup. Useful when the app can&apos;t open a browser to sign in.
            </p>
            {access && !access.allowed ? null : <KeyForm serverUrl={serverUrl} needsBusiness={!org} />}

            {(keys ?? []).length > 0 && (
              <div className="mt-6 pb-2">
                <h4 className="text-sm font-semibold">Your keys</h4>
                <ul className="mt-2 divide-y divide-border text-sm">
                  {(keys ?? []).map((k) => (
                    <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div>
                        <p className="font-medium">
                          {k.name} <span className="font-normal text-muted">({k.key_prefix}…)</span>
                        </p>
                        <p className="text-xs text-muted">
                          Created {dateFormat.format(new Date(k.created_at))} ·{" "}
                          {k.revoked_at
                            ? `Revoked ${dateFormat.format(new Date(k.revoked_at))}`
                            : k.last_used_at
                              ? `Last used ${dateFormat.format(new Date(k.last_used_at))}`
                              : "Not used yet"}
                        </p>
                      </div>
                      {!k.revoked_at && (
                        <form action={revokeAccessKey.bind(null, k.id)}>
                          <button type="submit" className="btn-secondary">
                            Revoke
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  {active.length} active. Revoke a key you no longer use, or if you think someone else has it.
                </p>
              </div>
            )}
          </details>
        </section>

        <ConnectedApps userId={user.id} orgNames={orgNames} ownerOf={ownerOf} />
        {org && <ServiceKeys isOwner={org.role === "owner"} serverUrl={serverUrl} />}
        <ConnectionsSection />
      </div>
    </>
  );
}
