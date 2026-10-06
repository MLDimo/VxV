import { createDiscordRest, type DiscordRestOptions, type TitleAnnouncer } from "@vxv/server";
import { titlesMessage } from "./titlesMessage.ts";

/** The channel where each week's titles are announced. */
export function createDiscordTitleAnnouncer({
  channelId,
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): TitleAnnouncer {
  const request = createDiscordRest(options);
  return {
    async announce(titles) {
      await request("POST", `/channels/${channelId}/messages`, { body: titlesMessage(titles, siteUrl) });
    },
  };
}
