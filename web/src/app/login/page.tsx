import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const raw = (await searchParams).next;
  const next = typeof raw === "string" ? safeNext(raw, "") || null : null;
  const connecting = next?.startsWith("/oauth/authorize") ?? false;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to Braventa</h1>
      <p className="mt-2 text-sm text-muted">
        {connecting
          ? "Sign in to connect your AI assistant to Braventa. You'll choose the business and approve the access next."
          : "Enter a website and get a growth score, five opportunities, a 30-day plan and your first content."}
      </p>
      <AuthForm next={next} />
    </>
  );
}
