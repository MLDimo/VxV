import type { BetAnnouncer, DiscordRestOptions } from "@vxv/server";
import { betMessage } from "./betMessage.ts";
import { createDiscordMessageAnnouncer } from "./messageAnnouncer.ts";

/** The guild's bets channel: each bet's message, refreshed at each stake. */
export function createDiscordBetAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): BetAnnouncer {
  return createDiscordMessageAnnouncer({ ...options, render: (bet) => betMessage(bet, siteUrl) });
}
