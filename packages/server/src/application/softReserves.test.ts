import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Character } from "../domain/characters.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot, recordLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ValidationError } from "./errors.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";

describe("soft reserves", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let softReserves: ReturnType<typeof createSoftReserves>;
  let signups: ReturnType<typeof createSignups>;
  let me: Member;
  let other: Member;
  let deja: Character;
  let eole: Character;
  let eventId: string;

  const signUp = (member: Member, character: Character) =>
    signups.signUp(member, eventId, { characterId: character.id, role: "dps", spec: "Combat", status: "present" });

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => new Date("2026-12-01T12:00:00Z");
    softReserves = createSoftReserves({ unitOfWork });
    signups = createSignups({ unitOfWork, clock });
    me = await createMember(sql, "member", "Moi");
    other = await createMember(sql, "member", "Autre");
    [deja, eole] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes");
    await characterRepository(sql).link(deja.id, me.id);
    await characterRepository(sql).link(eole.id, other.id);
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, me, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    await database.close();
  });

  const board = async (member: Member) => {
    const result = await softReserves.getBoard(member, eventId);
    if (result === undefined) {
      throw new Error("the event should exist");
    }
    return result;
  };

  it("lists the loot of the event's raids in boss order", async () => {
    const { items, allowance, mySignup } = await board(me);
    expect(allowance).toBe(1);
    expect(mySignup).toBeUndefined();
    expect(items.map((item) => [item.bossName, item.name])).toEqual([
      ["Gardienne", "Cape de la gardienne"],
      ["Onyxia", "Sac en peau"],
      ["Onyxia", "Tête d'Onyxia"],
    ]);
  });

  it("records the member's soft reserve and shows it to everyone", async () => {
    await signUp(me, deja);
    await signUp(other, eole);
    await softReserves.setMine(me, eventId, ["20"]);
    const seenByOther = (await board(other)).items.find((item) => item.itemId === 20);
    expect(seenByOther).toMatchObject({ reservedBy: [{ characterName: "Ðéjà Vu" }], mine: false });
    expect((await board(me)).items.find((item) => item.itemId === 20)?.mine).toBe(true);
  });

  it("replaces the member's soft reserves on each choice, and clears them with an empty choice", async () => {
    await signUp(me, deja);
    await softReserves.setMine(me, eventId, ["20"]);
    await softReserves.setMine(me, eventId, ["10"]);
    const mine = async () => (await board(me)).items.filter((item) => item.mine).map((item) => item.itemId);
    expect(await mine()).toEqual([10]);
    await softReserves.setMine(me, eventId, []);
    expect(await mine()).toEqual([]);
  });

  it("counts the signed-up characters who already own an item", async () => {
    await signUp(me, deja);
    const pastEvent = await createEvent(sql, me, new Date("2026-11-01T20:00:00Z"), ["onyxia"]);
    await recordLoot(sql, { eventId: pastEvent, encounterId: 2, itemId: 20, characterId: deja.id });
    await recordLoot(sql, { eventId: pastEvent, encounterId: 2, itemId: 21, characterId: eole.id });
    const items = (await board(me)).items;
    expect(items.find((item) => item.itemId === 20)?.alreadyOwnedBy).toBe(1);
    expect(items.find((item) => item.itemId === 21)?.alreadyOwnedBy).toBe(0);
  });

  it("refuses soft reserves without sign-up, beyond the allowance or outside the loot", async () => {
    await expect(softReserves.setMine(me, eventId, ["20"])).rejects.toThrow(/Inscrivez-vous/);
    await signUp(me, deja);
    await expect(softReserves.setMine(me, eventId, ["20", "21"])).rejects.toThrow("Vous avez droit à 1 SR au plus.");
    await expect(softReserves.setMine(me, eventId, ["999"])).rejects.toBeInstanceOf(ValidationError);
    expect((await board(me)).items.filter((item) => item.mine)).toEqual([]);
  });

  it("drops the soft reserves when the member brings another character", async () => {
    const [suis] = await createGuildCharacters(sql, "Suis Surtescotes");
    await characterRepository(sql).link(suis.id, me.id);
    await signUp(me, deja);
    await softReserves.setMine(me, eventId, ["20"]);
    await signUp(me, suis);
    expect((await board(me)).items.find((item) => item.itemId === 20)?.reservedBy).toEqual([]);
  });

  it("has no board for an unknown event", async () => {
    expect(await softReserves.getBoard(me, "not-an-id")).toBeUndefined();
  });
});
