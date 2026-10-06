import { createDiscordRest, DiscordApiError, type BetAnnouncer, type DiscordRestOptions } from "@vxv/server";
import { betMessage } from "./betMessage.ts";

const HTTP_NOT_FOUND = 404;

/** The guild's bets channel: each bet's message, refreshed at each stake. */
export function createDiscordBetAnnouncer({
  channelId,
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): BetAnnouncer {
  const request = createDiscordRest(options);
  return {
    async publish(bet) {
      const message = await request<{ id: string }>("POST", `/channels/${channelId}/messages`, {
        body: betMessage(bet, siteUrl),
      });
      return { channelId, messageId: message.id };
    },

    async update({ channelId: messageChannelId, messageId }, bet) {
      try {
        await request("PATCH", `/channels/${messageChannelId}/messages/${messageId}`, {
          body: betMessage(bet, siteUrl),
        });
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
