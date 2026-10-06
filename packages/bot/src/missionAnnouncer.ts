import type { DiscordRestOptions, MissionAnnouncer } from "@vxv/server";
import { createDiscordMessageAnnouncer } from "./messageAnnouncer.ts";
import { missionMessage } from "./missionMessage.ts";

/** The guild's missions channel: each mission's message, refreshed with its ranking. */
export function createDiscordMissionAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): MissionAnnouncer {
  return createDiscordMessageAnnouncer({ ...options, render: (mission) => missionMessage(mission, siteUrl) });
}
