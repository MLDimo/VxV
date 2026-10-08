import type { DiscordRestOptions, DuelAnnouncer } from "@vxv/server";
import { duelMessage } from "./duelMessage.ts";
import { createDiscordMessageAnnouncer } from "./messageAnnouncer.ts";

/** The guild's PvP channel: each duel's message, refreshed as it goes. */
export function createDiscordDuelAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): DuelAnnouncer {
  return createDiscordMessageAnnouncer({ ...options, render: (duel) => duelMessage(duel, siteUrl) });
}
