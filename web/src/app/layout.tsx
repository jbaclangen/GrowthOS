import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Comfortaa, Quicksand } from "next/font/google";
import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/account-menu";
import { AssistantLauncher } from "@/components/assistant";
import { BusinessSwitcher } from "@/components/business-switcher";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { memberOrganizations } from "@/lib/memberships";
import { planLabel } from "@/lib/plans/label";
import { effectiveAccess } from "@/lib/plans/tiers";
import { getOrgAccess } from "@/lib/plans/access";
import { TermsBanner } from "@/components/legal/terms-banner";
import { signOut } from "./login/actions";
import "./globals.css";

// Founder decision D-015: Quicksand for headings and the logo, Comfortaa for everything else.
const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"] });
const comfortaa = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Braventa", template: "%s · Braventa" },
  description:
    "Braventa connects your website, marketing, CRM, and content into one growth system that shows you what to do next — and helps you get it done.",
  applicationName: "Braventa",
  // The app is private: never indexed or followed (also X-Robots-Tag in next.config.ts and robots.ts).
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${quicksand.variable} ${comfortaa.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
            <Link href="/dashboard" aria-label="Braventa home" className="shrink-0 text-foreground">
              <Logo height={28} />
            </Link>
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <Suspense fallback={null}>
          <TermsBanner />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

async function UserMenu() {
  // Per-request: the session check and the trial countdown both depend on the current time (Cache Components).
  await connection();
  const user = await getUser();
  if (!user) return null;
  const [access, orgs] = await Promise.all([
    getOrgAccess(user.id),
    memberOrganizations(await createSupabaseServerClient(), user.id),
  ]);
  // D-030: the current business's tier, with the days left in a Pro trial.
  const plan = access ? planLabel(access) : null;
  // D-062: the businesses the person belongs to, for the switcher.
  const businesses = orgs.map((o) => ({ id: o.id, name: o.name, plan: planLabel(effectiveAccess(o)) }));
  // The in-app assistant (D-043): an active trial or a plan; otherwise the bar says what unlocks it.
  const assistant = !access ? "needs_business" : access.subscribed ? "enabled" : "needs_plan";
  // Every item keeps its size (shrink-0, no wrapping) except the email, which truncates; on phones the account items
  // sit in AccountMenu instead, so the row fits from 320px up without scrolling sideways.
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
      <AssistantLauncher state={assistant} />
      {businesses.length > 0 && <BusinessSwitcher businesses={businesses} currentId={access?.orgId ?? null} className="hidden sm:inline-flex" />}
      {plan && (
        <Link href="/plans" className="chip hidden shrink-0 whitespace-nowrap bg-accent-soft text-accent-soft-foreground hover:underline md:inline-flex">
          {plan}
        </Link>
      )}
      <span className="hidden min-w-0 truncate text-muted lg:block">{user.email}</span>
      <Link href="/settings" className="hidden shrink-0 text-muted hover:underline sm:inline">
        Settings
      </Link>
      <form action={signOut} className="hidden shrink-0 sm:block">
        <button type="submit" className="btn-secondary whitespace-nowrap">
          Sign out
        </button>
      </form>
      <AccountMenu email={user.email ?? ""} plan={plan} business={access?.orgName ?? null} signOut={signOut} />
    </div>
  );
}
