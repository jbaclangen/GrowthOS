import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Every secret the MCP server accepts is a random value with a recognizable prefix, shown once and stored only as a
// SHA-256 hash. Pure functions, unit-tested.
//
//   brv_…      personal access key (D-036), 32 random bytes → 43 base64url characters
//   brv_sk_…   service key (organization-level, for automation)
//   brv_at_…   OAuth access token (1 hour)
//   brv_rt_…   OAuth refresh token (30 days, rotated on every use)
//   brv_ac_…   OAuth authorization code (10 minutes, one use)
//   brv_cs_…   OAuth client secret (only for clients that register as confidential)
// The lengths differ (prefix + 43), so a personal key can never be read as one of the others.

export const PREFIX = {
  personal: "brv_",
  service: "brv_sk_",
  access: "brv_at_",
  refresh: "brv_rt_",
  code: "brv_ac_",
  clientSecret: "brv_cs_",
  clientId: "brv_client_",
} as const;

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const CODE_TTL_SECONDS = 10 * 60;
// How long after a refresh token is rotated the same client may present it again without ending the grant (lib/oauth/grants.ts).
export const REFRESH_REUSE_GRACE_SECONDS = 60;

const RANDOM = "[A-Za-z0-9_-]{43}";
const PATTERNS = {
  service: new RegExp(`^brv_sk_${RANDOM}$`),
  access: new RegExp(`^brv_at_${RANDOM}$`),
  refresh: new RegExp(`^brv_rt_${RANDOM}$`),
  code: new RegExp(`^brv_ac_${RANDOM}$`),
  clientSecret: new RegExp(`^brv_cs_${RANDOM}$`),
  personal: new RegExp(`^brv_${RANDOM}$`),
};

export type SecretKind = keyof typeof PATTERNS;

export const randomSecret = (prefix: string) => `${prefix}${randomBytes(32).toString("base64url")}`;

export function generateSecret(kind: Exclude<SecretKind, "personal">) {
  return randomSecret(PREFIX[kind]);
}

export const newClientId = () => `${PREFIX.clientId}${randomBytes(16).toString("base64url")}`;

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function isSecretOfKind(value: string | null | undefined, kind: SecretKind): value is string {
  return typeof value === "string" && PATTERNS[kind].test(value);
}

// What kind of credential a bearer value is, judged by its format alone (before touching the database).
export function classifyBearer(value: string): "personal" | "service" | "access" | null {
  if (PATTERNS.service.test(value)) return "service";
  if (PATTERNS.access.test(value)) return "access";
  if (PATTERNS.personal.test(value)) return "personal";
  return null;
}

// Reads "Authorization: Bearer <value>". Returns the raw value (any format) or null when the header is absent or
// malformed; the caller classifies it.
export function bearerFromHeader(header: string | null) {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
