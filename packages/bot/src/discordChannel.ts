import { createDiscordRest, DiscordApiError, type DiscordRestOptions } from "@vxv/server";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";

const HTTP_NOT_FOUND = 404;

type MessageBody = RESTPostAPIChannelMessageJSONBody;

/** A channel the bot writes in: it posts messages there, and edits them as what they show changes. */
export function discordChannel({ channelId, ...options }: DiscordRestOptions & { channelId: string }) {
  const request = createDiscordRest(options);
  return {
    channelId,

    /** Posts the message; returns its id. */
    async post(body: MessageBody): Promise<string> {
      return (await request<{ id: string }>("POST", `/channels/${channelId}/messages`, { body })).id;
    },

    /** Edits a message of the channel (or of the one it was posted in); false when it was deleted on Discord. */
    async edit(messageId: string, body: MessageBody, inChannel = channelId): Promise<boolean> {
      try {
        await request("PATCH", `/channels/${inChannel}/messages/${messageId}`, { body });
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
