import "server-only";
import { createInteractionHandler, parsePublicKey, type InteractionHandler } from "@vxv/bot";
import { getApplication } from "./application";
import { getConfig } from "./config";

let handler: InteractionHandler | undefined;

/** One interaction handler per server instance, on the same use cases as the website. */
export function getInteractionHandler(): InteractionHandler {
  if (handler === undefined) {
    const { discord } = getConfig();
    handler = createInteractionHandler({
      publicKey: parsePublicKey(discord.publicKey),
      app: getApplication(),
      linkChannelId: discord.linkChannelId,
      raidChannelId: discord.raidChannelId,
    });
  }
  return handler;
}
