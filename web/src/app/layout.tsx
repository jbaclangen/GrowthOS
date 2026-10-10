import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Comfortaa, Quicksand } from "next/font/google";
import { Logo } from "@/components/brand/logo";
import { getUser } from "@/lib/auth";
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
  const user = await getUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">{user.email}</span>
      <form action={signOut}>
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}
