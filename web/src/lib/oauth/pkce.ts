import { createHash } from "node:crypto";
import { safeEqual } from "./tokens";

// PKCE (RFC 7636), S256 only: OAuth 2.1 and the MCP authorization spec require it for every client.

// RFC 7636 §4.1: 43–128 characters from the unreserved set.
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
// A base64url SHA-256 digest without padding is always 43 characters.
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export const isValidChallenge = (challenge: string | null | undefined): challenge is string =>
  typeof challenge === "string" && CHALLENGE.test(challenge);

export function s256(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function verifyPkce(verifier: string | null | undefined, challenge: string) {
  if (typeof verifier !== "string" || !VERIFIER.test(verifier)) return false;
  return safeEqual(s256(verifier), challenge);
}
