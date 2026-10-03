import { InteractionResponseType, InteractionType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { createInteractionHandler } from "./interactions.ts";
import { parsePublicKey } from "./signature.ts";
import { createTestSigner } from "./testing.ts";

describe("interaction handler", () => {
  const discord = createTestSigner();
  const handle = createInteractionHandler({ publicKey: parsePublicKey(discord.publicKeyHex) });

  it("answers Discord's ping, which validates the endpoint", async () => {
    expect(await handle(discord.sign({ type: InteractionType.Ping }))).toEqual({
      status: 200,
      body: { type: InteractionResponseType.Pong },
    });
  });

  it("refuses an unsigned request with 401", async () => {
    const reply = await handle({
      body: JSON.stringify({ type: InteractionType.Ping }),
      signature: null,
      timestamp: null,
    });
    expect(reply.status).toBe(401);
  });
});
