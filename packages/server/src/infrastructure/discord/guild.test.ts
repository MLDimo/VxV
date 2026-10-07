import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GuildGateway } from "../../application/discordPorts.ts";
import { createFakeDiscord, type FakeDiscord } from "./fakeDiscord.ts";
import { createDiscordGuild } from "./guild.ts";
import { DiscordApiError } from "./rest.ts";

const CLASSES = ["Guerrier", "Voleur", "Druide"];

describe("Discord guild through the REST API", () => {
  let discord: FakeDiscord;
  let guild: GuildGateway;

  beforeEach(() => {
    discord = createFakeDiscord({ ownerId: "owner" });
    vi.stubGlobal("fetch", discord.fetch);
    guild = createDiscordGuild({ token: "token", guildId: "guild" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates the class role when missing and gives it to the member", async () => {
    await guild.setOnlyRoleAmong("200", "Voleur", CLASSES);
    expect(discord.roleNamesOf("200")).toEqual(["Voleur"]);
  });

  it("swaps the class role when the main changes, reusing existing roles", async () => {
    await guild.setOnlyRoleAmong("200", "Voleur", CLASSES);
    await guild.setOnlyRoleAmong("200", "Druide", CLASSES);
    await guild.setOnlyRoleAmong("300", "Voleur", CLASSES);
    expect(discord.roleNamesOf("200")).toEqual(["Druide"]);
    expect(discord.roleNamesOf("300")).toEqual(["Voleur"]);
    expect(discord.requests.filter((request) => request.method === "POST")).toHaveLength(2);
  });

  it("renames a member, but reports that Discord refuses to rename the owner", async () => {
    expect(await guild.setNickname("200", "Martin - [Ðéjà Vu]")).toBe(true);
    expect(discord.nicknameOf("200")).toBe("Martin - [Ðéjà Vu]");
    expect(await guild.setNickname("owner", "GM - [Eole Hermes]")).toBe(false);
  });

  it("reads the roles of a member, and knows when they left the server", async () => {
    await guild.setOnlyRoleAmong("200", "Voleur", CLASSES);
    expect(await guild.fetchRoleIds("200")).toHaveLength(1);
    discord.leave("200");
    expect(await guild.fetchRoleIds("200")).toBeUndefined();
  });

  it("lets any other refusal surface", async () => {
    const broken = createDiscordGuild({ token: "token", guildId: "guild", apiUrl: "https://discord.test/unknown" });
    await expect(broken.setOnlyRoleAmong("200", "Voleur", CLASSES)).rejects.toBeInstanceOf(DiscordApiError);
  });
});
