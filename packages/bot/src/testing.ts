import { createPrivateKey, createPublicKey, randomBytes, sign } from "node:crypto";
import type { SignedRequest } from "./interactions.ts";

// PKCS#8 header of an Ed25519 private key, followed by its 32-byte seed.
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SEED_BYTES = 32;

/**
 * A key pair standing for the Discord application, and requests signed as Discord would sign them.
 * A fixed seed gives the same keys in every process (end-to-end tests: website and test runner).
 */
export function createTestSigner(seed: Buffer = randomBytes(SEED_BYTES)) {
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
  const { x } = createPublicKey(privateKey).export({ format: "jwk" });
  return {
    publicKeyHex: Buffer.from(x ?? "", "base64url").toString("hex"),
    sign(body: unknown, timestamp = "1791000000"): SignedRequest & { signature: string; timestamp: string } {
      const text = JSON.stringify(body);
      return {
        body: text,
        signature: sign(null, Buffer.from(timestamp + text), privateKey).toString("hex"),
        timestamp,
      };
    },
  };
}
