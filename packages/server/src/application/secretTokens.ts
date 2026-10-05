import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;

/** Unguessable secret handed out once: a session cookie, a companion token or a link code. */
export function generateSecretToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** What is stored of a secret: its hash, so that a database leak does not expose usable secrets. */
export function hashSecret(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** PKCE (S256): the challenge sent first is the base64url SHA-256 of the verifier revealed afterwards. */
export function verifierMatches(verifier: string, challenge: string): boolean {
  const expected = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const received = Buffer.from(challenge);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
