import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { memberOrganizations } from "@/lib/memberships";
import { acceptBlocker, invitationState, inviteTokenHash, isInviteToken } from "@/lib/team/invitations";
import { ROLE_LABELS } from "@/lib/team/roles";
import { invitationByTokenHash } from "@/lib/team/team-server";
import { signOut } from "@/app/login/actions";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Join a business" };

// An invite link from Settings → Team (D-046). Signed-out visitors are sent to sign in or create an account first
// (proxy.ts keeps this path as ?next=), then come back here and select Join.
export default function InvitePage(props: PageProps<"/invite/[token]">) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Invite {...props} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const user = await requireUser();
  const invite = isInviteToken(token) ? await invitationByTokenHash(createSupabaseAdminClient(), inviteTokenHash(token)) : null;

  if (!invite) {
    return (
      <section className="card">
        <h1 className="text-xl font-semibold">This invite link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted">Check you copied all of it, or ask the person who invited you for a new link.</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-block">
          Go to your dashboard
        </Link>
      </section>
    );
  }

  const mine = await memberOrganizations(await createSupabaseServerClient(), user.id);
  const blocker = acceptBlocker({
    state: invitationState(invite),
    invitedEmail: invite.email,
    userEmail: user.email,
    alreadyMember: mine.some((o) => o.id === invite.organizationId),
    otherBusiness: mine.find((o) => o.id !== invite.organizationId)?.name ?? null,
    organizationName: invite.organizationName,
  });
  const wrongAccount = !blocker ? false : (user.email ?? "").toLowerCase() !== invite.email;

  return (
    <section className="card">
      <p className="eyebrow">Invite</p>
      <h1 className="mt-1 text-xl font-semibold">Join {invite.organizationName} on Braventa</h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;re invited as {ROLE_LABELS[invite.role].toLowerCase()} ({invite.email}). What each role can do is listed in
        Settings after you join.
      </p>
      {blocker ? (
        <>
          <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
            {blocker}
          </p>
          {wrongAccount ? (
            <form action={signOut} className="mt-4">
              <button type="submit" className="btn-secondary">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/dashboard" className="btn-secondary mt-4 inline-block">
              Go to your dashboard
            </Link>
          )}
        </>
      ) : (
        <AcceptForm token={token} organizationName={invite.organizationName} />
      )}
    </section>
  );
}
