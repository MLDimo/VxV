import { createPublicKey, verify, type KeyObject } from "node:crypto";

const ED25519_PUBLIC_KEY_HEX = /^[0-9a-f]{64}$/i;
const ED25519_SIGNATURE_HEX = /^[0-9a-f]{128}$/i;

/** Reads the application's public key, shown in hexadecimal on the Discord Developer Portal. */
export function parsePublicKey(hex: string): KeyObject {
  if (!ED25519_PUBLIC_KEY_HEX.test(hex)) {
    throw new Error("The Discord public key must be 64 hexadecimal characters.");
  }
  const x = Buffer.from(hex, "hex").toString("base64url");
  return createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" });
}

/** Discord signs every interaction: Ed25519 over the timestamp followed by the raw body. */
export function isSignedByDiscord(
  publicKey: KeyObject,
  request: { body: string; signature: string | null; timestamp: string | null },
): boolean {
  const { body, signature, timestamp } = request;
  if (signature === null || timestamp === null || !ED25519_SIGNATURE_HEX.test(signature)) {
    return false;
  }
  return verify(null, Buffer.from(timestamp + body), publicKey, Buffer.from(signature, "hex"));
}
