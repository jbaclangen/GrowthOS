import { createHash, randomBytes } from "node:crypto";

// Personal access keys for the AI assistant connection (MCP, D-036). Pure functions, so they're unit-tested.
// A key is shown to the owner once; only its SHA-256 hash and a short prefix (to recognize it in the list) are stored.

export const KEY_PREFIX = "brv_";
const KEY_PATTERN = /^brv_[A-Za-z0-9_-]{43}$/;

export function generateKey() {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

// What the key list shows, e.g. "brv_Ab3dEf…".
export function displayPrefix(key: string) {
  return key.slice(0, 10);
}

// Reads the key from "Authorization: Bearer brv_…". Anything else is rejected before touching the database.
export function keyFromAuthHeader(header: string | null) {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  const key = match?.[1];
  return key && KEY_PATTERN.test(key) ? key : null;
}
