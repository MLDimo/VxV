import type { DiscordRestOptions, MissionAnnouncer } from "@vxv/server";
import { discordChannel } from "./discordChannel.ts";
import { createDiscordMessageAnnouncer } from "./messageAnnouncer.ts";
import { missionMessage, missionResultsMessage } from "./missionMessage.ts";

/** The guild's missions channel: each mission's message, refreshed with its ranking; then its results. */
export function createDiscordMissionAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): MissionAnnouncer {
  const channel = discordChannel(options);
  return {
    ...createDiscordMessageAnnouncer({ ...options, render: (mission) => missionMessage(mission, siteUrl) }),
    async results(mission) {
      await channel.post(missionResultsMessage(mission, siteUrl));
    },
  };
}
