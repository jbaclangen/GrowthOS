import type { Metadata } from "next";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to Braventa</h1>
      <p className="mt-2 text-sm text-muted">
        Enter a website and get a growth score, five opportunities, a 30-day plan and your first content.
      </p>
      <AuthForm />
    </main>
  );
}
