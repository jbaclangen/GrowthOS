import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Comfortaa, Quicksand } from "next/font/google";
import { Logo } from "@/components/brand/logo";
import { AssistantLauncher } from "@/components/assistant";
import { getUser } from "@/lib/auth";
import { getOrgAccess } from "@/lib/plans/access";
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
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
            <Link href="/dashboard" aria-label="Braventa home" className="text-foreground">
              <Logo height={28} />
            </Link>
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
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
  const access = await getOrgAccess();
  // D-030: the current tier, with the days left in a Pro trial.
  const planLabel = !access
    ? null
    : access.trial?.active
      ? `Pro trial · ${access.trial.daysLeft} day${access.trial.daysLeft === 1 ? "" : "s"} left`
      : access.tier === "basic"
        ? "Basic"
        : access.tier === "pro"
          ? "Pro"
          : "Premium";
  // The in-app assistant (D-042): an active trial or a plan; otherwise the bar says what unlocks it.
  const assistant = !access ? "needs_business" : access.subscribed ? "enabled" : "needs_plan";
  return (
    <div className="flex items-center gap-2 text-sm sm:gap-3">
      <AssistantLauncher state={assistant} />
      {planLabel && (
        <Link href="/plans" className="chip bg-accent-soft text-accent-soft-foreground hover:underline">
          {planLabel}
        </Link>
      )}
      <span className="hidden text-muted lg:inline">{user.email}</span>
      <Link href="/settings" className="text-muted hover:underline">
        Settings
      </Link>
      <form action={signOut}>
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}
