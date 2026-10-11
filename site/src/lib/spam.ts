import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Spam protection for the contact form (Q-033): a signed render-time token rejects forms submitted faster than a
// person could fill them, and a salted IP hash lets the database rate-limit visitors without storing their IP.
// CONTACT_HASH_SALT is a long random secret set on the braventa-site Vercel project.

const MIN_FILL_MS = 3_000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function salt() {
  const s = process.env.CONTACT_HASH_SALT;
  return s && s.length >= 32 ? s : null;
}

const sign = (value: string, key: string) => createHmac("sha256", key).update(value).digest("hex");

// Issued when the form is rendered. Without a salt (local development) the check is skipped.
export function issueFormToken(now = Date.now()) {
  const key = salt();
  return key ? `${now}.${sign(String(now), key)}` : "";
}

export type TokenCheck = "ok" | "too_fast" | "invalid" | "unchecked";

export function checkFormToken(token: string, now = Date.now()): TokenCheck {
  const key = salt();
  if (!key) return "unchecked";
  const [ts, mac] = token.split(".");
  if (!ts || !mac || !/^\d+$/.test(ts)) return "invalid";
  const expected = Buffer.from(sign(ts, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - Number(ts);
  if (age < MIN_FILL_MS) return "too_fast";
  if (age > MAX_AGE_MS) return "invalid";
  return "ok";
}

// Vercel sets x-forwarded-for; the first entry is the client.
export function visitorHash(headers: Headers) {
  const key = salt();
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
  return key && ip ? sign(`ip:${ip}`, key) : null;
}
