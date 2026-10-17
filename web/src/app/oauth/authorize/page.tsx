import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { mcpAccess } from "@/lib/mcp/access";
import { memberOrganizations } from "@/lib/memberships";
import { authorizePageView, checkAuthorizeRequest, type AuthorizeParams } from "@/lib/oauth/authorize-request";
import { SCOPES } from "@/lib/oauth/scopes";
import { findClient } from "@/lib/oauth/supabase-store";
import { AUTHORIZE_PARAM_KEYS, originFromHeaders } from "@/lib/oauth/request-origin";
import { MAX_NEXT_LENGTH } from "@/lib/safe-next";
import { ConsentForm } from "./consent-form";

// OAuth consent ("Sign in with Braventa") for AI assistants connecting to the MCP server: claude.ai, Claude Desktop,
// Claude Code and ChatGPT. The owner signs in, picks the business and approves the access shown.
//
// Framing is blocked for every page (X-Frame-Options: DENY in next.config.ts), which stops classic clickjacking.
// It doesn't stop double-clickjacking, where another site swaps this page in under a double-click without a frame;
// the consent form keeps Approve disabled until the page has been visible and focused for a moment (click-guard.ts).
// This page never redirects to the app by itself: errors show the app's return host and a link to click
// (authorizePageView), so a link to it can't bounce someone to an address anyone could register.

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

async function Authorize({ searchParams }: { searchParams: PageProps<"/oauth/authorize">["searchParams"] }) {
  const raw = await searchParams;
  const params: AuthorizeParams = {};
  for (const key of AUTHORIZE_PARAM_KEYS) {
    const v = raw[key];
    if (typeof v === "string") params[key] = v;
  }

  // Validate before asking anyone to sign in: a request that can't succeed shouldn't cost a sign-in first.
  const origin = await originFromHeaders();
  const client = await findClient(createSupabaseAdminClient(), params.client_id);
  const view = authorizePageView(checkAuthorizeRequest(params, client, origin));
  if (view.kind === "problem") return <Problem message={view.message} />;
  if (view.kind === "return-to-app") return <ReturnToApp detail={view.detail} host={view.host} href={view.href} />;
  const { request } = view;

  const user = await getUser();
  if (!user) {
    const next = `/oauth/authorize?${new URLSearchParams(params as Record<string, string>).toString()}`;
    // Sign-in only returns to paths up to MAX_NEXT_LENGTH (lib/safe-next.ts); a longer one would silently land on the
    // dashboard instead of the consent screen.
    if (next.length > MAX_NEXT_LENGTH) {
      return <Problem message="This app sent a sign-in request that's too long for Braventa, so it can't connect. Contact the app's developer." />;
    }
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const orgs = await memberOrganizations(await createSupabaseServerClient(), user.id);
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

// A protocol error for an app whose return address is registered. The person chooses whether to go back there.
function ReturnToApp({ detail, host, href }: { detail: string; host: string; href: string }) {
  return (
    <div className="card" role="alert">
      <h1 className="text-lg font-semibold">This connection can&apos;t continue</h1>
      <p className="mt-2 text-sm">
        The app sent a sign-in request Braventa can&apos;t accept, so nothing was connected. Go back to the app and try again,
        or contact its developer.
      </p>
      <p className="mt-2 text-xs text-muted">Details for the developer: {detail}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {/* A plain link: the app's address is shown, and nothing happens until it's clicked. */}
        <a href={href} className="btn-secondary" rel="noreferrer">
          Return to {host}
        </a>
        <Link href="/dashboard" className="btn-secondary">
          Go to Braventa
        </Link>
      </div>
    </div>
  );
}
