// Plain-language errors (ROADMAP Next, item 1): what happened and what to do, in the owner's words. Raw errors
// (database, AI provider, network) stay in the server log and in ai_jobs.error for the team; the owner sees these.
// Pure and client-safe.

export type PlainError = { what: string; next: string };

const TRY_AGAIN = "Run the analysis again in a few minutes. If it keeps failing, contact us at hello@braventa.io.";

// Ordered: the first rule whose pattern matches the stored job error wins.
const JOB_RULES: { test: RegExp; error: PlainError }[] = [
  {
    test: /monthly ai budget reached/i,
    error: {
      what: "This business has used its AI allowance for the month.",
      next: "New analyses can run again next month. Contact us at hello@braventa.io if you need one sooner.",
    },
  },
  {
    test: /private or reserved network address|links can't be analyzed|standard web ports|username or password can't be analyzed/i,
    error: {
      what: "Braventa can't analyze this web address.",
      next: "Use your website's public address, such as https://example.com, and start a new analysis.",
    },
  },
  {
    test: /returned [45]\d\d\b|redirected more than|fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|certificate|socket hang up|aborted due to timeout/i,
    error: {
      what: "Braventa couldn't open your website.",
      next: "Check that the site loads in a browser, then run the analysis again.",
    },
  },
  {
    test: /no enabled module has evidence/i,
    error: {
      what: "There wasn't enough information from your website to score it.",
      next: "Check that your home page loads and shows readable text, then run the analysis again.",
    },
  },
  {
    test: /website analysis is missing|no diagnosis to update|diagnosis wasn't found/i,
    error: {
      what: "Part of the earlier analysis this step needed is missing.",
      next: "Run the analysis again to rebuild the report.",
    },
  },
  {
    test: /analysis couldn't continue/i,
    error: { what: "The analysis stopped partway through.", next: "Run it again. Your answers are kept." },
  },
  {
    test: /openrouter|unusable json|no json object|token limit|provider error/i,
    error: { what: "The AI service didn't give a usable answer.", next: TRY_AGAIN },
  },
  {
    test: /failed:|insert failed|lookup failed|could not check the ai budget|could not queue/i,
    error: { what: "Braventa couldn't save the results.", next: TRY_AGAIN },
  },
];

const JOB_DEFAULT: PlainError = { what: "Something went wrong while analyzing your website.", next: TRY_AGAIN };

// The stored job error (ai_jobs.error) as something the owner can act on. Never shows the raw text.
export function jobFailureMessage(raw: string | null | undefined): PlainError {
  if (!raw) return JOB_DEFAULT;
  return JOB_RULES.find((r) => r.test.test(raw))?.error ?? JOB_DEFAULT;
}

// Supabase Auth error codes (https://supabase.com/docs/guides/auth/debugging/error-codes) as sign-in and sign-up
// messages. Anything unknown gets the fallback, never the provider's own text.
const AUTH_MESSAGES: Record<string, string> = {
  email_not_confirmed: "Confirm your email first. Check your inbox for the link.",
  invalid_credentials: "That email and password don't match. Try again.",
  user_already_exists: "An account with this email already exists. Sign in instead.",
  email_exists: "An account with this email already exists. Sign in instead.",
  weak_password: "Choose a longer password with a mix of letters, numbers and symbols.",
  email_address_invalid: "That email address doesn't look right. Check it and try again.",
  validation_failed: "That email address doesn't look right. Check it and try again.",
  over_email_send_rate_limit: "Too many emails were sent to this address. Wait a few minutes, then try again.",
  over_request_rate_limit: "Too many attempts. Wait a few minutes, then try again.",
  signup_disabled: "New accounts can't be created right now. Contact us at hello@braventa.io.",
  user_banned: "This account can't sign in. Contact us at hello@braventa.io.",
};

export function authErrorMessage(error: { code?: string | null }, action: "sign-in" | "sign-up"): string {
  const known = error.code ? AUTH_MESSAGES[error.code] : undefined;
  if (known) return known;
  return action === "sign-in"
    ? "Sign-in didn't work. Try again in a minute."
    : "Your account couldn't be created. Try again in a minute.";
}
