import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mcpAccess } from "@/lib/mcp/access";
import { revokeAccessKey } from "./actions";
import { KeyForm } from "./key-form";

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
  await requireUser();
  const org = await getCurrentOrg();
  const supabase = await createSupabaseServerClient();
  const [{ data: keys }, { data: orgRow }] = await Promise.all([
    supabase
      .from("mcp_access_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false }),
    org
      ? supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const access = orgRow ? mcpAccess(orgRow) : null;
  const host = (await headers()).get("host") ?? "app.braventa.io";
  const serverUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}/api/mcp`;
  const active = (keys ?? []).filter((k) => !k.revoked_at);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section id="ai-assistant" className="card mt-6 scroll-mt-20" aria-labelledby="ai-access">
        <p className="eyebrow">AI assistant access</p>
        <h2 id="ai-access" className="mt-1 text-lg font-semibold">
          Connect Claude to Braventa
        </h2>
        <p className="mt-2 text-sm text-muted">
          If you&apos;ve already worked on your business with Claude, it can answer Braventa&apos;s setup questions for
          you: your website, the problems holding the business back, your priorities and the follow-up questions. You
          still confirm the diagnosis and approve posts here in Braventa. Works with Claude Code and Claude Desktop;
          claude.ai and ChatGPT are coming soon.
        </p>

        {access && !access.allowed ? (
          <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
            Your free trial has ended, so the AI assistant connection is paused. It works again once you&apos;re on a
            plan.{" "}
            <Link href="/plans" className="underline">
              Choose a plan
            </Link>
          </p>
        ) : (
          <KeyForm serverUrl={serverUrl} needsBusiness={!org} />
        )}

        {(keys ?? []).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Your keys</h3>
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
      </section>
    </>
  );
}
