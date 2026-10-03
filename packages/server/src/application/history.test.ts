import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Character } from "../domain/characters.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { softReserveRepository } from "../infrastructure/postgres/softReserves.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot, recordLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createHistory } from "./history.ts";
import { createSignups } from "./signups.ts";

describe("loot history", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let history: ReturnType<typeof createHistory>;

  let deja: Character;
  let eole: Character;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    history = createHistory({ unitOfWork: createUnitOfWork(sql) });
    [deja, eole] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes");
  });

  /** An Onyxia event where Ðéjà Vu, signed up, soft-reserved the head (item 20). */
  async function prepareEventWithReserve(): Promise<string> {
    const me = await createMember(sql, "member", "Moi");
    await characterRepository(sql).link(deja.id, me.id);
    await createRaidWithLoot(sql);
    const eventId = await createEvent(sql, me, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
    const signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => new Date("2026-12-01T12:00:00Z") });
    await signups.signUp(me, eventId, { characterId: deja.id, role: "dps", spec: "Combat", status: "present" });
    await softReserveRepository(sql).replaceForCharacter(eventId, deja.id, [20]);
    return eventId;
  }

  afterEach(async () => {
    await database.close();
  });

  it("lists every loot with how it was given and who had reserved it, latest first", async () => {
    const eventId = await prepareEventWithReserve();
    await recordLoot(sql, { eventId, encounterId: 2, itemId: 21, characterId: eole.id, method: "free_roll" });
    await recordLoot(sql, { eventId, encounterId: 2, itemId: 20, characterId: eole.id, method: "loot_council" });

    expect(await history.listLoots({ softReserveOnly: false })).toEqual([
      expect.objectContaining({
        eventId,
        raids: ["Onyxia"],
        bossName: "Onyxia",
        itemName: "Tête d'Onyxia",
        winnerName: "Eole Hermes",
        method: "loot_council",
        softReservedBy: ["Ðéjà Vu"],
      }),
      expect.objectContaining({ itemName: "Sac en peau", method: "free_roll", softReservedBy: [] }),
    ]);
  });

  it("keeps only the loots given by soft reserve, with or without bonus, when asked", async () => {
    const eventId = await prepareEventWithReserve();
    await recordLoot(sql, { eventId, encounterId: 2, itemId: 21, characterId: eole.id, method: "free_roll" });
    await recordLoot(sql, { eventId, encounterId: 2, itemId: 20, characterId: deja.id, method: "soft_reserve" });
    await recordLoot(sql, { eventId, encounterId: 1, itemId: 10, characterId: deja.id, method: "soft_reserve_plus" });

    const loots = await history.listLoots({ softReserveOnly: true });
    expect(loots.map((loot) => [loot.itemName, loot.method])).toEqual([
      ["Cape de la gardienne", "soft_reserve_plus"],
      ["Tête d'Onyxia", "soft_reserve"],
    ]);
  });

  it("is empty before any loot", async () => {
    expect(await history.listLoots({ softReserveOnly: false })).toEqual([]);
  });
});
