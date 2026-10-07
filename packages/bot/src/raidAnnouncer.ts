import type { DiscordRestOptions, RaidAnnouncer } from "@vxv/server";
import { discordChannel } from "./discordChannel.ts";
import { raidMessage } from "./raidMessage.ts";
import { recapMessage } from "./recapMessage.ts";
import { reminderMessage } from "./reminderMessage.ts";

/** The guild's raid channel: the events' sign-up messages, the reminders and the end-of-raid recaps. */
export function createDiscordRaidAnnouncer({
  siteUrl,
  ...options
}: DiscordRestOptions & { channelId: string; siteUrl: string }): RaidAnnouncer {
  const channel = discordChannel(options);
  return {
    async publish(raid) {
      return channel.post(raidMessage(raid, siteUrl));
    },

    async remind(reminder) {
      await channel.post(reminderMessage(reminder, siteUrl));
    },

    async recap(recap) {
      await channel.post(recapMessage(recap, siteUrl));
    },

    async update(messageId, raid) {
      return channel.edit(messageId, raidMessage(raid, siteUrl));
    },
  };
}
