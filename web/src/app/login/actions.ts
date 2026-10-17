"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type AuthState = { error?: string; message?: string } | undefined;

const credentials = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters for your password"),
});

function parse(formData: FormData) {
  return credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") return { error: "Confirm your email first. Check your inbox for the link." };
  if (error?.code === "invalid_credentials") return { error: "That email and password don't match. Try again." };
  if (error) return { error: error.message };
  // Back to where sign-in was asked for, such as an AI assistant's connection request (/oauth/authorize).
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const next = safeNext(formData.get("next"), "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(next);
  return { message: "Check your email for a confirmation link, then come back and sign in." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
