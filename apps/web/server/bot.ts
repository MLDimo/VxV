import "server-only";
import { createInteractionHandler, parsePublicKey, type InteractionHandler } from "@vxv/bot";
import { getConfig } from "./config";

let handler: InteractionHandler | undefined;

/** One interaction handler per server instance. */
export function getInteractionHandler(): InteractionHandler {
  handler ??= createInteractionHandler({ publicKey: parsePublicKey(getConfig().discord.publicKey) });
  return handler;
}
