import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GuildGateway } from "../../application/discordPorts.ts";
import { createFakeDiscord, type FakeDiscord } from "./fakeDiscord.ts";
import { createDiscordGuild } from "./guild.ts";
import { DiscordApiError } from "./rest.ts";

const CLASSES = ["Guerrier", "Voleur", "Druide"];
const ROGUE = { name: "Voleur", color: 0xfff468 };
const DRUID = { name: "Druide", color: 0xff7c0a };

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

  it("creates the class role in its colour when missing and gives it to the member", async () => {
    await guild.setOnlyRoleAmong("200", ROGUE, CLASSES);
    expect(discord.roleNamesOf("200")).toEqual(["Voleur"]);
    expect(discord.roleColorOf("Voleur")).toBe(0xfff468);
  });

  it("gives its colour back to a class role made by hand, and leaves a right one alone", async () => {
    discord.addRole("Voleur");
    await guild.setOnlyRoleAmong("200", ROGUE, CLASSES);
    await guild.setOnlyRoleAmong("300", ROGUE, CLASSES);
    expect(discord.roleColorOf("Voleur")).toBe(0xfff468);
    expect(discord.requests.filter((request) => request.method === "PATCH")).toHaveLength(1);
  });

  it("swaps the class role when the main changes, reusing existing roles", async () => {
    await guild.setOnlyRoleAmong("200", ROGUE, CLASSES);
    await guild.setOnlyRoleAmong("200", DRUID, CLASSES);
    await guild.setOnlyRoleAmong("300", ROGUE, CLASSES);
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
    await guild.setOnlyRoleAmong("200", ROGUE, CLASSES);
    expect(await guild.fetchRoleIds("200")).toHaveLength(1);
    discord.leave("200");
    expect(await guild.fetchRoleIds("200")).toBeUndefined();
  });

  it("lists the server's roles, @everyone and the bots' told apart", async () => {
    const raider = discord.addRole("Raideur R1");
    const bot = discord.addRole("VXV", true);
    expect(await guild.listRoles()).toEqual([
      { id: "guild", name: "@everyone", everyone: true, managed: false },
      { id: raider, name: "Raideur R1", everyone: false, managed: false },
      { id: bot, name: "VXV", everyone: false, managed: true },
    ]);
  });

  it("lets any other refusal surface", async () => {
    const broken = createDiscordGuild({ token: "token", guildId: "guild", apiUrl: "https://discord.test/unknown" });
    await expect(broken.setOnlyRoleAmong("200", ROGUE, CLASSES)).rejects.toBeInstanceOf(DiscordApiError);
  });
});
