import type { DiscordRestOptions, EventAnnouncer, EventKind } from "@vxv/server";
import { discordChannel } from "./discordChannel.ts";
import { raidMessage } from "./raidMessage.ts";
import { recapMessage } from "./recapMessage.ts";
import { reminderMessage, softReserveReminderMessage } from "./reminderMessage.ts";

/**
 * The guild's raid channel: the raid nights' sign-up messages, the reminders and the end-of-raid recaps; and the PvP
 * channel, for the PvP outings'.
 */
export function createDiscordRaidAnnouncer({
  siteUrl,
  channelId,
  pvpChannelId,
  ...options
}: DiscordRestOptions & { channelId: string; pvpChannelId: string; siteUrl: string }): EventAnnouncer {
  const channels: Record<EventKind, ReturnType<typeof discordChannel>> = {
    raid: discordChannel({ ...options, channelId }),
    pvp: discordChannel({ ...options, channelId: pvpChannelId }),
  };
  return {
    async publish(announced) {
      return channels[announced.event.kind].post(raidMessage(announced, siteUrl));
    },

    async remind(reminder) {
      await channels[reminder.event.kind].post(reminderMessage(reminder, siteUrl));
    },

    async remindSoftReserves(reminder) {
      await channels.raid.post(softReserveReminderMessage(reminder, siteUrl));
    },

    async recap(recap) {
      await channels.raid.post(recapMessage(recap, siteUrl));
    },

    async update(messageId, announced) {
      return channels[announced.event.kind].edit(messageId, raidMessage(announced, siteUrl));
    },
  };
}
