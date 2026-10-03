import { describe, expect, it } from "vitest";
import { isSignedByDiscord, parsePublicKey } from "./signature.ts";
import { createTestSigner } from "./testing.ts";

describe("Discord request signature", () => {
  const discord = createTestSigner();
  const publicKey = parsePublicKey(discord.publicKeyHex);

  it("accepts a request signed with the application's key", () => {
    expect(isSignedByDiscord(publicKey, discord.sign({ type: 1 }))).toBe(true);
  });

  it("refuses a modified body, another key, or missing headers", () => {
    const signed = discord.sign({ type: 1 });
    expect(isSignedByDiscord(publicKey, { ...signed, body: '{"type":2}' })).toBe(false);
    expect(isSignedByDiscord(publicKey, createTestSigner().sign({ type: 1 }))).toBe(false);
    expect(isSignedByDiscord(publicKey, { ...signed, signature: null })).toBe(false);
    expect(isSignedByDiscord(publicKey, { ...signed, timestamp: null })).toBe(false);
    expect(isSignedByDiscord(publicKey, { ...signed, signature: "not-hex" })).toBe(false);
  });

  it("refuses a public key that is not 32 bytes of hexadecimal", () => {
    expect(() => parsePublicKey("abc")).toThrow(/64 hexadecimal/);
  });
});
