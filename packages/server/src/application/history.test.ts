import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    history = createHistory({ unitOfWork: createUnitOfWork(sql) });
  });

  afterEach(async () => {
    await database.close();
  });

  it("lists only loots of soft-reserved items, with their reservers, latest first", async () => {
    const me = await createMember(sql, "member", "Moi");
    const [deja, eole] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes");
    await characterRepository(sql).link(deja.id, me.id);
    await createRaidWithLoot(sql);
    const eventId = await createEvent(sql, me, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
    const signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => new Date("2026-12-01T12:00:00Z") });
    await signups.signUp(me, eventId, { characterId: deja.id, role: "dps", spec: "Combat", status: "present" });
    await softReserveRepository(sql).replaceForCharacter(eventId, deja.id, [20]);

    await recordLoot(sql, { eventId, encounterId: 2, itemId: 21, characterId: eole.id });
    await recordLoot(sql, { eventId, encounterId: 2, itemId: 20, characterId: eole.id });

    expect(await history.listSoftReservedLoots()).toEqual([
      expect.objectContaining({
        eventId,
        raids: ["Onyxia"],
        bossName: "Onyxia",
        itemName: "Tête d'Onyxia",
        winnerName: "Eole Hermes",
        softReservedBy: ["Ðéjà Vu"],
      }),
    ]);
  });

  it("is empty before any loot", async () => {
    expect(await history.listSoftReservedLoots()).toEqual([]);
  });
});
