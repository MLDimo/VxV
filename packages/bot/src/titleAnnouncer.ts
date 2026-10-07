import type { DiscordRestOptions, TitleAnnouncer } from "@vxv/server";
import { discordChannel } from "./discordChannel.ts";
import { titlesMessage } from "./titlesMessage.ts";

/** The channel where each week's titles are announced. */
export function createDiscordTitleAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): TitleAnnouncer {
  const channel = discordChannel(options);
  return {
    async announce(titles) {
      await channel.post(titlesMessage(titles, siteUrl));
    },
  };
}
