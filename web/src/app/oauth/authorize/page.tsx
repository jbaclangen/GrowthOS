import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { mcpAccess } from "@/lib/mcp/access";
import { checkAuthorizeRequest, type AuthorizeParams } from "@/lib/oauth/authorize-request";
import { SCOPES } from "@/lib/oauth/scopes";
import { findClient } from "@/lib/oauth/supabase-store";
import { AUTHORIZE_PARAM_KEYS, originFromHeaders } from "@/lib/oauth/request-origin";
import { ConsentForm } from "./consent-form";

// OAuth consent ("Sign in with Braventa") for AI assistants connecting to the MCP server: claude.ai, Claude Desktop,
// Claude Code and ChatGPT. The owner signs in, picks the business and approves the access shown. Framing is blocked
// for every page (X-Frame-Options: DENY in next.config.ts), so the buttons can't be clickjacked.

export const metadata: Metadata = { title: "Connect an app" };

export default function AuthorizePage({ searchParams }: PageProps<"/oauth/authorize">) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Authorize searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Org = { id: string; name: string; plan: string; trial_ends_at: string };

async function Authorize({ searchParams }: { searchParams: PageProps<"/oauth/authorize">["searchParams"] }) {
  const raw = await searchParams;
  const params: AuthorizeParams = {};
  for (const key of AUTHORIZE_PARAM_KEYS) {
    const v = raw[key];
    if (typeof v === "string") params[key] = v;
  }

  const user = await getUser();
  if (!user) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${query}`)}`);
  }

  const origin = await originFromHeaders();
  const client = await findClient(createSupabaseAdminClient(), params.client_id);
  const check = checkAuthorizeRequest(params, client, origin);
  if (check.kind === "redirect-error") redirect(check.url);
  if (check.kind === "show-error") return <Problem message={check.message} />;
  const { request } = check;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, plan, trial_ends_at)")
    .order("created_at");
  const orgs = (data ?? []).map((m) => m.organizations as unknown as Org).filter(Boolean);
  const redirectHost = new URL(request.redirectUri).host;

  return (
    <>
      <p className="eyebrow">Connect an app</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Allow {request.clientName} to use Braventa?
      </h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as {user.email}. After you approve, you go back to <strong className="text-foreground">{redirectHost}</strong>.
        Only continue if you started connecting from there.
      </p>

      <section className="card mt-6" aria-labelledby="access-heading">
        <h2 id="access-heading" className="text-sm font-semibold">
          {request.clientName} will be able to
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {request.scopes.map((s) => (
            <li key={s}>
              <span className="font-medium">{SCOPES[s].label}.</span> <span className="text-muted">{SCOPES[s].detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium">It won&apos;t be able to</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Confirm the diagnosis, accept plan items or approve drafts. Those stay in Braventa.</li>
          <li>Publish anything, send email or change your website.</li>
          <li>See your Braventa password or other connected accounts.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Braventa hasn&apos;t reviewed this app; the name is what it calls itself. You can disconnect it any time in Settings →
          Integrations.
        </p>
      </section>

      {orgs.length === 0 ? (
        <div className="card mt-6 text-sm">
          <p>You don&apos;t have a business in Braventa yet, so there&apos;s nothing to connect.</p>
          <Link href="/settings#ai-assistant" className="btn-primary mt-3">
            Set up your business
          </Link>
        </div>
      ) : (
        <ConsentForm
          params={params}
          orgs={orgs.map((o) => ({ id: o.id, name: o.name, paused: !mcpAccess(o).allowed }))}
        />
      )}
    </>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="card" role="alert">
      <h1 className="text-lg font-semibold">This connection can&apos;t continue</h1>
      <p className="mt-2 text-sm">{message}</p>
      <Link href="/dashboard" className="btn-secondary mt-4">
        Go to Braventa
      </Link>
    </div>
  );
}
