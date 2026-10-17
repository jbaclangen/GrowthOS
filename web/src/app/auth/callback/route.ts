import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Email confirmation landing: exchanges the PKCE code (or OTP token hash) for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation code") };

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Confirmation link is invalid or expired")}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
