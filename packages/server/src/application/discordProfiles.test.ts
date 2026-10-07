import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Member } from "../domain/members.ts";
import { createFakeDiscord, type FakeDiscord } from "../infrastructure/discord/fakeDiscord.ts";
import { createDiscordGuild } from "../infrastructure/discord/guild.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createDiscordProfiles } from "./discordProfiles.ts";

describe("Discord profiles", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let discord: FakeDiscord;
  let profiles: ReturnType<typeof createDiscordProfiles>;
  let me: Member;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    discord = createFakeDiscord({ ownerId: "discord-GM" });
    vi.stubGlobal("fetch", discord.fetch);
    profiles = createDiscordProfiles({
      unitOfWork: createUnitOfWork(sql),
      guild: createDiscordGuild({ token: "token", guildId: "guild" }),
    });
    me = await createMember(sql, "member", "Martin");
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  const linkMain = async (member: Member, name: string) => {
    const [character] = await createGuildCharacters(sql, name);
    await characterRepository(sql).link(character.id, member.id);
    await characterRepository(sql).setMain(member.id, character.id);
  };

  it("names the member after their main and gives them its class role", async () => {
    await linkMain(me, "Ðéjà Vu");
    expect(await profiles.sync(me)).toBe("updated");
    expect(discord.nicknameOf(me.discordId)).toBe("Martin - [Ðéjà Vu]");
    expect(discord.roleNamesOf(me.discordId)).toEqual(["Voleur"]);
  });

  it("leaves Discord untouched for a member without main", async () => {
    expect(await profiles.sync(me)).toBe("noMain");
    expect(discord.requests).toEqual([]);
  });

  it("describes the outcome for the member, and never fails when Discord does", async () => {
    await linkMain(me, "Ðéjà Vu");
    expect(await profiles.syncForMessage(me)).toBe("Pseudo Discord et rôle de classe mis à jour.");
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await profiles.syncForMessage(me)).toMatch(/n'ont pas pu être mis à jour/);
  });

  it("still sets the class role of the server owner, whom no bot may rename", async () => {
    const owner = await createMember(sql, "gm", "GM");
    await linkMain(owner, "Eole Hermes");
    expect(await profiles.sync(owner)).toBe("nicknameRefused");
    expect(discord.roleNamesOf(owner.discordId)).toEqual(["Voleur"]);
  });
});
