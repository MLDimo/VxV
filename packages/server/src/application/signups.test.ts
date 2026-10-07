import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character } from "../domain/characters.ts";
import type { Member } from "../domain/members.ts";
import { createFakeDiscord, type FakeDiscord } from "../infrastructure/discord/fakeDiscord.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaids, testGuild } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ValidationError } from "./errors.ts";
import { createSignups } from "./signups.ts";

describe("sign-ups", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let signups: ReturnType<typeof createSignups>;
  let me: Member;
  let main: Character;
  let reroll: Character;
  let eventId: string;
  let now: Date;

  const choice = (character: Character, overrides = {}) => ({
    characterId: character.id,
    role: "dps",
    spec: "Combat",
    status: "present",
    ...overrides,
  });

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    now = new Date("2026-12-01T12:00:00Z");
    signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => now, guild: testGuild });
    me = await createMember(sql, "member", "Moi");
    [main, reroll] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes");
    const characters = characterRepository(sql);
    await characters.link(main.id, me.id);
    await characters.link(reroll.id, me.id);
    await createRaids(sql, { onyxia: "Onyxia" });
    eventId = await createEvent(sql, me, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    await database.close();
  });

  it("signs a member up with one of their characters", async () => {
    await signups.signUp(me, eventId, choice(main, { spec: " Combat " }));
    expect(await signups.findMine(me, eventId)).toEqual({
      eventId,
      memberId: me.id,
      characterId: main.id,
      characterName: "Ðéjà Vu",
      characterClass: "ROGUE",
      role: "dps",
      spec: "Combat",
      status: "present",
    });
  });

  it("updates the sign-up when the member signs up again", async () => {
    await signups.signUp(me, eventId, choice(main));
    await signups.signUp(me, eventId, choice(main, { status: "late", role: "tank", spec: "Protection" }));
    expect(await signups.listForEvent(eventId)).toEqual([
      expect.objectContaining({ characterId: main.id, role: "tank", status: "late", spec: "Protection" }),
    ]);
  });

  it("replaces the sign-up when the member brings another character", async () => {
    await signups.signUp(me, eventId, choice(main));
    await signups.signUp(me, eventId, choice(reroll, { role: "healer", spec: "Sacré" }));
    expect((await signups.listForEvent(eventId)).map((signup) => signup.characterName)).toEqual(["Eole Hermes"]);
  });

  it("lists sign-ups tanks first, then healers, then DPS", async () => {
    const other = await createMember(sql, "member", "Autre");
    const third = await createMember(sql, "member", "Troisième");
    const [suis, ugly] = await createGuildCharacters(sql, "Suis Surtescotes", "Ugly Hole");
    await characterRepository(sql).link(suis.id, other.id);
    await characterRepository(sql).link(ugly.id, third.id);
    await signups.signUp(me, eventId, choice(main));
    await signups.signUp(other, eventId, choice(suis, { role: "healer", spec: "Sacré" }));
    await signups.signUp(third, eventId, choice(ugly, { role: "tank", spec: "Protection" }));
    expect((await signups.listForEvent(eventId)).map((signup) => signup.role)).toEqual(["tank", "healer", "dps"]);
  });

  it("refuses a character of another member, an unknown event and a started raid", async () => {
    const other = await createMember(sql, "member", "Autre");
    await expect(signups.signUp(other, eventId, choice(main))).rejects.toThrow(/vos personnages/);
    await expect(signups.signUp(me, "not-an-id", choice(main))).rejects.toThrow(/n'existe pas/);
    now = new Date("2026-12-10T20:00:00Z");
    await expect(signups.signUp(me, eventId, choice(main))).rejects.toBeInstanceOf(ValidationError);
    expect(await signups.listForEvent(eventId)).toEqual([]);
  });

  describe("for an event reserved to a Discord role", () => {
    let discord: FakeDiscord;
    let raiders: string;
    let reserved: string;

    beforeEach(async () => {
      discord = createFakeDiscord();
      vi.stubGlobal("fetch", discord.fetch);
      raiders = discord.addRole("Raideur R1");
      reserved = await createEvent(sql, me, new Date("2026-12-11T20:00:00Z"), ["onyxia"], {
        id: raiders,
        name: "Raideur R1",
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const giveRole = () => discord.handle("PUT", `/guilds/guild/members/${me.discordId}/roles/${raiders}`, undefined);

    it("signs up a holder of the role, as Discord tells at once", async () => {
      giveRole();
      await signups.signUp(me, reserved, choice(main));
      expect(await signups.findMine(me, reserved)).toMatchObject({ characterId: main.id });
    });

    it("refuses a member without the role, and one who left the server", async () => {
      await expect(signups.signUp(me, reserved, choice(main))).rejects.toThrow(
        "Ce raid est réservé au rôle Discord « Raideur R1 ».",
      );
      giveRole();
      discord.leave(me.discordId);
      await expect(signups.signUp(me, reserved, choice(main))).rejects.toThrow(/réservé au rôle/);
      expect(await signups.listForEvent(reserved)).toEqual([]);
    });

    it("lets a member signed up already change their sign-up after losing the role", async () => {
      giveRole();
      await signups.signUp(me, reserved, choice(main));
      discord.handle("DELETE", `/guilds/guild/members/${me.discordId}/roles/${raiders}`, undefined);
      await signups.signUp(me, reserved, choice(main, { status: "absent" }));
      expect(await signups.findMine(me, reserved)).toMatchObject({ status: "absent" });
    });

    it("refuses the sign-up while Discord does not answer", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await expect(signups.signUp(me, reserved, choice(main))).rejects.toThrow(/Discord ne répond pas/);
    });

    it("never asks Discord for an event open to everybody", async () => {
      await signups.signUp(me, eventId, choice(main));
      expect(discord.requests).toEqual([]);
    });
  });
});
