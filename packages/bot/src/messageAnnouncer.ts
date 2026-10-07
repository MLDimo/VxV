import type { DiscordRestOptions, MessageAnnouncer } from "@vxv/server";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { discordChannel } from "./discordChannel.ts";

/** A channel where each item has its message (a bet, a mission), written by render and refreshed as it changes. */
export function createDiscordMessageAnnouncer<Item>({
  render,
  ...options
}: DiscordRestOptions & {
  channelId: string;
  render: (item: Item) => RESTPostAPIChannelMessageJSONBody;
}): MessageAnnouncer<Item> {
  const channel = discordChannel(options);
  return {
    async publish(item) {
      return { channelId: channel.channelId, messageId: await channel.post(render(item)) };
    },

    async update({ channelId, messageId }, item) {
      return channel.edit(messageId, render(item), channelId);
    },
  };
}
