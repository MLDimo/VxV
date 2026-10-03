import type { PGliteInterface } from "@electric-sql/pglite";
import { InteractionResponseType, InteractionType } from "discord-api-types/v10";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createInteractionHandler, type InteractionHandler } from "./interactions.ts";
import { parsePublicKey } from "./signature.ts";
import { createTestApplication } from "./testApplication.ts";
import { createTestSigner, slashCommand } from "./testing.ts";

describe("interaction handler", () => {
  const discord = createTestSigner();
  let database: PGliteInterface;
  let handle: InteractionHandler;

  beforeAll(async () => {
    const test = await createTestApplication(["Ðéjà;Vu;ROGUE"]);
    database = test.database;
    handle = createInteractionHandler({
      publicKey: parsePublicKey(discord.publicKeyHex),
      app: test.app,
      linkChannelId: "links",
    });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

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

  it("answers an unknown command privately", async () => {
    const reply = await handle(
      discord.sign(slashCommand("vxv_inconnue", {}, { userId: "1", name: "Déjà", channelId: "x" })),
    );
    expect(reply.body).toMatchObject({ data: { content: "Cette action n'est pas encore disponible.", flags: 64 } });
  });
});
