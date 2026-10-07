import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Character } from "../domain/characters.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaids } from "../test/fixtures.ts";
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
    signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => now });
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
});
