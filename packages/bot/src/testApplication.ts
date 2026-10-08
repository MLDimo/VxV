import type { PGliteInterface } from "@vxv/database/testing";
import { createApplication, createDiscordGuild, type Application, type DiscordRoleMapping } from "@vxv/server";
import type { BotContext } from "./commands.ts";
import { createDiscordBetAnnouncer } from "./betAnnouncer.ts";
import { createDiscordMissionAnnouncer } from "./missionAnnouncer.ts";
import { createDiscordTitleAnnouncer } from "./titleAnnouncer.ts";
import { createDiscordDeathrollAnnouncer } from "./deathrollAnnouncer.ts";
import { createDiscordRaidAnnouncer } from "./raidAnnouncer.ts";
import { createFakeDiscord, createTestDatabase, type FakeDiscord } from "@vxv/server/testing";
import { vi } from "vitest";

export const TEST_ROLES: DiscordRoleMapping = { treasurer: "treasurer-role", officer: "officer-role", gm: "gm-role" };

/** Discord user who owns the test server: no bot may rename them. */
export const SERVER_OWNER = "owner";
export const LINK_CHANNEL = "links";
export const RAID_CHANNEL = "raids";
export const PVP_CHANNEL = "pvp";
export const BETS_CHANNEL = "bets";
export const MISSIONS_CHANNEL = "missions";
export const SITE_URL = "https://vxv.test";
/** The test server's id, which Discord also gives @everyone. */
export const TEST_GUILD_ID = "guild";

/**
 * The real use cases on a fresh migrated database, with guild characters imported by an officer,
 * and a fake Discord server in place of fetch (vi.unstubAllGlobals after each test).
 */
export async function createTestApplication(
  roster: readonly string[],
): Promise<{ app: Application; database: PGliteInterface; discord: FakeDiscord; context: BotContext }> {
  const { database, sql } = await createTestDatabase();
  const discord = createFakeDiscord({ ownerId: SERVER_OWNER });
  vi.stubGlobal("fetch", discord.fetch);
  const app = createApplication({
    sql,
    discordRoles: TEST_ROLES,
    guild: createDiscordGuild({ token: "token", guildId: TEST_GUILD_ID }),
    announcer: createDiscordRaidAnnouncer({
      token: "token",
      channelId: RAID_CHANNEL,
      pvpChannelId: PVP_CHANNEL,
      siteUrl: SITE_URL,
    }),
    betAnnouncer: createDiscordBetAnnouncer({ token: "token", channelId: BETS_CHANNEL, siteUrl: SITE_URL }),
    missionAnnouncer: createDiscordMissionAnnouncer({ token: "token", channelId: MISSIONS_CHANNEL, siteUrl: SITE_URL }),
    titleAnnouncer: createDiscordTitleAnnouncer({ token: "token", channelId: RAID_CHANNEL, siteUrl: SITE_URL }),
    deathrollAnnouncer: createDiscordDeathrollAnnouncer({ token: "token", channelId: RAID_CHANNEL, siteUrl: SITE_URL }),
  });
  const officer = await app.auth.identify({ discordId: "officer", discordName: "Officier" }, [TEST_ROLES.officer]);
  await app.roster.importRoster(officer, ["VXV-ROSTER-1", ...roster].join("\n"), "Liste de guilde des tests");
  return {
    app,
    database,
    discord,
    context: {
      app,
      linkChannelId: LINK_CHANNEL,
      raidChannelId: RAID_CHANNEL,
      pvpChannelId: PVP_CHANNEL,
      betsChannelId: BETS_CHANNEL,
      missionsChannelId: MISSIONS_CHANNEL,
    },
  };
}
