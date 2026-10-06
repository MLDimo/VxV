import { createDiscordRest, type DeathrollAnnouncer, type DiscordRestOptions } from "@vxv/server";
import { deathrollMessage } from "./deathrollMessage.ts";

/** The channel where the deathrolls played for a big stake are told. */
export function createDiscordDeathrollAnnouncer({
  channelId,
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): DeathrollAnnouncer {
  const request = createDiscordRest(options);
  return {
    async announce(game) {
      await request("POST", `/channels/${channelId}/messages`, { body: deathrollMessage(game, siteUrl) });
    },
  };
}
