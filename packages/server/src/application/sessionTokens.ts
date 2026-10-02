import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

/** Unguessable token sent to the browser in the session cookie. */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** The stored session id: a hash, so that a database leak does not expose usable sessions. */
export function sessionIdFromToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
