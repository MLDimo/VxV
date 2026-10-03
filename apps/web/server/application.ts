import "server-only";
import { createDiscordRaidAnnouncer } from "@vxv/bot";
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
      announcer: createDiscordRaidAnnouncer({ ...rest, channelId: discord.raidChannelId, siteUrl }),
    });
  }
  return application;
}
