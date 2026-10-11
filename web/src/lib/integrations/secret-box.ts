import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

// Authenticated encryption for integration secrets (OAuth refresh tokens) and the short-lived OAuth state cookie.
// AES-256-GCM with a random 96-bit IV per value. Stored format: "v1:<iv>:<tag>:<ciphertext>", each part base64url.
// The key is INTEGRATIONS_ENCRYPTION_KEY (32 bytes, base64). Never log plaintext or ciphertext.

const VERSION = "v1";

export function encryptWithKey(plaintext: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

// Throws on a wrong key, a tampered value or an unknown format. Callers treat that as "secret unusable".
export function decryptWithKey(value: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error("Unsupported secret format");
  const [, iv, tag, ciphertext] = parts.map((p, i) => (i === 0 ? Buffer.alloc(0) : Buffer.from(p, "base64url")));
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function key() {
  return Buffer.from(env().INTEGRATIONS_ENCRYPTION_KEY, "base64");
}

export const encryptSecret = (plaintext: string) => encryptWithKey(plaintext, key());
export const decryptSecret = (value: string) => decryptWithKey(value, key());
