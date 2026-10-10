import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";

const environment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/postgres",
  SITE_URL: "https://vxv.test",
  CRON_SECRET: "c".repeat(32),
  DISCORD_CLIENT_ID: "111",
  DISCORD_CLIENT_SECRET: "secret",
  DISCORD_PUBLIC_KEY: "ab".repeat(32),
  DISCORD_BOT_TOKEN: "bot-token",
  DISCORD_GUILD_ID: "222",
  DISCORD_LINK_CHANNEL_ID: "333",
  DISCORD_RAID_CHANNEL_ID: "444",
  DISCORD_ROLE_CONFIRMED: "5",
  DISCORD_ROLE_TREASURER: "2",
  DISCORD_ROLE_OFFICER: "3",
  DISCORD_ROLE_GM: "4",
};

describe("parseConfig", () => {
  it("reads a complete environment", () => {
    expect(parseConfig(environment)).toEqual({
      databaseUrl: environment.DATABASE_URL,
      siteUrl: "https://vxv.test",
      cronSecret: "c".repeat(32),
      discord: {
        clientId: "111",
        clientSecret: "secret",
        publicKey: "ab".repeat(32),
        botToken: "bot-token",
        apiUrl: undefined,
        guildId: "222",
        linkChannelId: "333",
        raidChannelId: "444",
        betsChannelId: "444",
        missionsChannelId: "444",
        titlesChannelId: "444",
        pvpChannelId: "444",
        duelsChannelId: "444",
        deathrollsChannelId: "444",
        roles: { confirmed: "5", treasurer: "2", officer: "3", gm: "4" },
      },
    });
  });

  it("publishes the bets in their own channel when one is given", () => {
    expect(parseConfig({ ...environment, DISCORD_BETS_CHANNEL_ID: "555" }).discord.betsChannelId).toBe("555");
    expect(parseConfig({ ...environment, DISCORD_PVP_CHANNEL_ID: "666" }).discord.pvpChannelId).toBe("666");
  });

  it("publishes the duels and the deathrolls in their own channels, else with the PvP and the bets", () => {
    const pvp = parseConfig({ ...environment, DISCORD_PVP_CHANNEL_ID: "666", DISCORD_BETS_CHANNEL_ID: "555" }).discord;
    expect(pvp).toMatchObject({ duelsChannelId: "666", deathrollsChannelId: "555" });
    const own = parseConfig({ ...environment, DISCORD_DUELS_CHANNEL_ID: "777", DISCORD_DEATHROLLS_CHANNEL_ID: "888" });
    expect(own.discord).toMatchObject({ duelsChannelId: "777", deathrollsChannelId: "888" });
  });

  it("names every missing or invalid variable", () => {
    const incomplete: Record<string, string | undefined> = { ...environment, DISCORD_GUILD_ID: "not-a-snowflake" };
    delete incomplete.DISCORD_CLIENT_SECRET;
    expect(() => parseConfig(incomplete)).toThrow(/DISCORD_CLIENT_SECRET[\s\S]*DISCORD_GUILD_ID/);
  });
});
