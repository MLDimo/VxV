import { createDiscordRest, DiscordApiError, type DiscordRestOptions, type MessageAnnouncer } from "@vxv/server";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";

const HTTP_NOT_FOUND = 404;

/** A channel where each item has its message (a bet, a mission), written by render and refreshed as it changes. */
export function createDiscordMessageAnnouncer<Item>({
  channelId,
  render,
  ...options
}: DiscordRestOptions & {
  channelId: string;
  render: (item: Item) => RESTPostAPIChannelMessageJSONBody;
}): MessageAnnouncer<Item> {
  const request = createDiscordRest(options);
  return {
    async publish(item) {
      const message = await request<{ id: string }>("POST", `/channels/${channelId}/messages`, { body: render(item) });
      return { channelId, messageId: message.id };
    },

    async update({ channelId: messageChannelId, messageId }, item) {
      try {
        await request("PATCH", `/channels/${messageChannelId}/messages/${messageId}`, { body: render(item) });
        return true;
      } catch (error) {
        if (error instanceof DiscordApiError && error.status === HTTP_NOT_FOUND) {
          return false;
        }
        throw error;
      }
    },
  };
}
