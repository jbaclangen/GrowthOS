import "server-only";
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Signs the "run the next step of this job" request (/api/jobs/continue). The route has no session: the token
// proves the request came from Braventa's own server for exactly this job and step. Pure functions take the key so
// they can be tested; continueKey() reads it from the environment.

// JOB_CONTINUE_SECRET (optional, at least 32 characters) wins; otherwise a key is derived from SUPABASE_SECRET_KEY
// with HKDF, so no new variable is strictly required. Rotating either key only invalidates in-flight continuations.
export function deriveContinueKey(own: string | undefined, base: string): Buffer {
  if (own) return Buffer.from(own, "utf8");
  return Buffer.from(hkdfSync("sha256", base, "braventa", "job-continue-v1", 32));
}

export function continueKey(): Buffer {
  const e = env();
  return deriveContinueKey(e.JOB_CONTINUE_SECRET, e.SUPABASE_SECRET_KEY);
}

export function signContinue(key: Buffer, jobId: string, step: string): string {
  return createHmac("sha256", key).update(`${jobId}\n${step}`).digest("base64url");
}

export function verifyContinue(key: Buffer, jobId: string, step: string, token: unknown): boolean {
  if (typeof token !== "string" || !token) return false;
  const expected = Buffer.from(signContinue(key, jobId, step), "utf8");
  const given = Buffer.from(token, "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
