import "server-only";
import { z } from "zod";

// Server-side environment. Importing this from a client component fails the build.
// Each variable is validated when first used, so one missing integration
// doesn't take down the others.
const schema = {
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  N8N_BASE_URL: z.url(),
  N8N_API_KEY: z.string().min(1),
  N8N_WEBHOOK_SECRET: z.string().min(32),
  GOOGLE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
};

export type ServerEnv = { [K in keyof typeof schema]: z.infer<(typeof schema)[K]> };

export function env(): ServerEnv {
  return new Proxy({} as ServerEnv, {
    get(_, key: string) {
      const field = schema[key as keyof typeof schema];
      if (!field) return undefined;
      const parsed = field.safeParse(process.env[key] || undefined);
      if (!parsed.success) throw new Error(`Missing or invalid environment variable: ${key}`);
      return parsed.data;
    },
  });
}
