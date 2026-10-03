import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";

const environment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/postgres",
  DISCORD_CLIENT_ID: "111",
  DISCORD_CLIENT_SECRET: "secret",
  DISCORD_PUBLIC_KEY: "ab".repeat(32),
  DISCORD_GUILD_ID: "222",
  DISCORD_LINK_CHANNEL_ID: "333",
  DISCORD_ROLE_TREASURER: "2",
  DISCORD_ROLE_OFFICER: "3",
  DISCORD_ROLE_GM: "4",
};

describe("parseConfig", () => {
  it("reads a complete environment", () => {
    expect(parseConfig(environment)).toEqual({
      databaseUrl: environment.DATABASE_URL,
      discord: {
        clientId: "111",
        clientSecret: "secret",
        publicKey: "ab".repeat(32),
        guildId: "222",
        linkChannelId: "333",
        roles: { treasurer: "2", officer: "3", gm: "4" },
      },
    });
  });

  it("names every missing or invalid variable", () => {
    const incomplete: Record<string, string | undefined> = { ...environment, DISCORD_GUILD_ID: "not-a-snowflake" };
    delete incomplete.DISCORD_CLIENT_SECRET;
    expect(() => parseConfig(incomplete)).toThrow(/DISCORD_CLIENT_SECRET[\s\S]*DISCORD_GUILD_ID/);
  });
});
