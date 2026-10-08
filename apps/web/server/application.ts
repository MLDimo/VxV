import "server-only";
import {
  createDiscordBetAnnouncer,
  createDiscordMissionAnnouncer,
  createDiscordRaidAnnouncer,
  createDiscordTitleAnnouncer,
  createDiscordDeathrollAnnouncer,
} from "@vxv/bot";
import { createApplication, createDiscordGuild, createPgSqlClient, type Application } from "@vxv/server";
import { getConfig } from "./config";

let application: Application | undefined;

/** One application (and one connection pool) per server instance. */
export function getApplication(): Application {
  if (application === undefined) {
    const { databaseUrl, siteUrl, discord } = getConfig();
    const rest = { token: discord.botToken, apiUrl: discord.apiUrl };
    application = createApplication({
      sql: createPgSqlClient(databaseUrl),
      discordRoles: discord.roles,
      guild: createDiscordGuild({ ...rest, guildId: discord.guildId }),
      announcer: createDiscordRaidAnnouncer({
        ...rest,
        channelId: discord.raidChannelId,
        pvpChannelId: discord.pvpChannelId,
        siteUrl,
      }),
      betAnnouncer: createDiscordBetAnnouncer({ ...rest, channelId: discord.betsChannelId, siteUrl }),
      missionAnnouncer: createDiscordMissionAnnouncer({ ...rest, channelId: discord.missionsChannelId, siteUrl }),
      titleAnnouncer: createDiscordTitleAnnouncer({ ...rest, channelId: discord.titlesChannelId, siteUrl }),
      // The big deathrolls go with the bets.
      deathrollAnnouncer: createDiscordDeathrollAnnouncer({ ...rest, channelId: discord.betsChannelId, siteUrl }),
    });
  }
  return application;
}
