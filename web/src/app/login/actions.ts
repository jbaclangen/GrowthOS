"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { authErrorMessage } from "@/lib/errors/plain";
import { CONSENT_REQUIRED, consentGiven } from "@/lib/legal/documents";
import { recordAcceptance } from "@/lib/legal/acceptances";

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
  if (error) {
    if (!error.code || !["email_not_confirmed", "invalid_credentials"].includes(error.code)) console.error("sign-in failed", error);
    return { error: authErrorMessage(error, "sign-in") };
  }
  // Back to where sign-in was asked for, such as an AI assistant's connection request (/oauth/authorize).
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // D-057: no account without agreeing to the Terms, MSA and DPA, and confirming 18+ and business use.
  if (!consentGiven(formData)) return { error: CONSENT_REQUIRED.signup };

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const next = safeNext(formData.get("next"), "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    console.error("sign-up failed", error);
    return { error: authErrorMessage(error, "sign-up") };
  }
  // Supabase answers an already-registered email with a user that has no identities (so it can't be probed); only a
  // real new account gets a record.
  if (data.user && (data.user.identities?.length ?? 0) > 0) {
    await recordAcceptance({ userId: data.user.id, context: "signup" });
  }
  if (data.session) redirect(next);
  return { message: "Check your email for a confirmation link, then come back and sign in." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
