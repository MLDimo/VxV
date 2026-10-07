import type { DeathrollAnnouncer, DiscordRestOptions } from "@vxv/server";
import { deathrollMessage } from "./deathrollMessage.ts";
import { discordChannel } from "./discordChannel.ts";

/** The channel where the deathrolls played for a big stake are told. */
export function createDiscordDeathrollAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): DeathrollAnnouncer {
  const channel = discordChannel(options);
  return {
    async announce(game) {
      await channel.post(deathrollMessage(game, siteUrl));
    },
  };
}
