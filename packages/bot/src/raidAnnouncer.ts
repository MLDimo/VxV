import { createDiscordRest, DiscordApiError, type DiscordRestOptions, type RaidAnnouncer } from "@vxv/server";
import { raidMessage } from "./raidMessage.ts";
import { reminderMessage } from "./reminderMessage.ts";

const HTTP_NOT_FOUND = 404;

/** Publishes and updates the events' sign-up messages in the guild's raid channel. */
export function createDiscordRaidAnnouncer({
  channelId,
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): RaidAnnouncer {
  const request = createDiscordRest(options);
  return {
    async publish(raid) {
      const message = await request<{ id: string }>("POST", `/channels/${channelId}/messages`, {
        body: raidMessage(raid, siteUrl),
      });
      return message.id;
    },

    async remind(reminder) {
      await request("POST", `/channels/${channelId}/messages`, { body: reminderMessage(reminder, siteUrl) });
    },

    async update(messageId, raid) {
      try {
        await request("PATCH", `/channels/${channelId}/messages/${messageId}`, { body: raidMessage(raid, siteUrl) });
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
