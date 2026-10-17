import "server-only";
import { z } from "zod";

// Server-side environment. Importing this from a client component fails the build.
// Each variable is validated when first used, so one missing integration
// doesn't take down the others. Values are trimmed: a stray space or line break pasted into the hosting
// dashboard otherwise breaks keys silently (seen in production 2026-10-12).
const schema = {
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  N8N_BASE_URL: z.url(),
  N8N_API_KEY: z.string().min(1),
  N8N_WEBHOOK_SECRET: z.string().min(32),
  GOOGLE_API_KEY: z.string().min(1),
  // Google Search Console connection (Pro). OAuth "Web application" client from the GCP project; see
  // docs/architecture/SEARCH_CONSOLE_SETUP.md. Optional: Settings says the connection isn't set up yet when unset.
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  // 32 random bytes, base64. Encrypts stored OAuth refresh tokens (AES-256-GCM, lib/integrations/secret-box.ts).
  INTEGRATIONS_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64-encoded"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  // Optional, at least 32 characters. Signs the hand-off between analysis steps (/api/jobs/continue); when unset, a
  // key is derived from SUPABASE_SECRET_KEY (lib/pipeline/continue-token.ts).
  JOB_CONTINUE_SECRET: z.string().min(32).optional(),
};

export type ServerEnv = { [K in keyof typeof schema]: z.infer<(typeof schema)[K]> };

export function env(): ServerEnv {
  return new Proxy({} as ServerEnv, {
    get(_, key: string) {
      const field = schema[key as keyof typeof schema];
      if (!field) return undefined;
      const parsed = field.safeParse(process.env[key]?.trim() || undefined);
      if (!parsed.success) throw new Error(`Missing or invalid environment variable: ${key}`);
      return parsed.data;
    },
  });
}

// True when every listed variable is present and valid. For optional integrations that degrade gracefully.
export function envConfigured(...keys: (keyof typeof schema)[]): boolean {
  return keys.every((key) => schema[key].safeParse(process.env[key]?.trim() || undefined).success);
}
