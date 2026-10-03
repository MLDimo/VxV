import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Character } from "../domain/characters.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createExclusions } from "./exclusions.ts";
import { createJournal } from "./journal.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";

describe("exclusions", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let exclusions: ReturnType<typeof createExclusions>;
  let softReserves: ReturnType<typeof createSoftReserves>;
  let journal: ReturnType<typeof createJournal>;
  let officer: Member;
  let member: Member;
  let deja: Character;
  let eventId: string;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    exclusions = createExclusions({ unitOfWork });
    softReserves = createSoftReserves({ unitOfWork });
    journal = createJournal({ unitOfWork });
    officer = await createMember(sql, "officer", "Officier");
    member = await createMember(sql, "member", "Membre");
    [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await characterRepository(sql).link(deja.id, member.id);
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
    const signups = createSignups({ unitOfWork, clock: () => new Date("2026-12-01T12:00:00Z") });
    await signups.signUp(member, eventId, { characterId: deja.id, role: "dps", spec: "Combat", status: "present" });
  });

  afterEach(async () => {
    await database.close();
  });

  const item = async (itemId: number) => {
    const board = await softReserves.getBoard(member, eventId);
    return board?.items.find((candidate) => candidate.itemId === itemId);
  };

  it("excludes an item, removes its reserves and records who was affected", async () => {
    await softReserves.setMine(member, eventId, ["20"]);
    await exclusions.exclude(officer, eventId, "20", "Objet réservé au tank principal");
    expect(await item(20)).toMatchObject({ excluded: true, reservedBy: [] });
    await expect(softReserves.setMine(member, eventId, ["20"])).rejects.toThrow(/exclu/);
    expect(await journal.listRecent()).toEqual([
      expect.objectContaining({
        action: "exclusion.add",
        reason: "Objet réservé au tank principal",
        after: {
          itemName: "Tête d'Onyxia",
          raids: ["Onyxia"],
          eventStartsAt: "2026-12-10T20:00:00.000Z",
          removedSoftReserves: ["Ðéjà Vu"],
        },
      }),
    ]);
  });

  it("allows an excluded item again", async () => {
    await exclusions.exclude(officer, eventId, "20", "Exclusion");
    await exclusions.include(officer, eventId, "20", "Erreur, objet libre");
    expect((await item(20))?.excluded).toBe(false);
    await softReserves.setMine(member, eventId, ["20"]);
    expect((await journal.listRecent()).map((entry) => entry.action)).toEqual(["exclusion.remove", "exclusion.add"]);
  });

  it("refuses a member, a missing reason, an item outside the event and a repeated change", async () => {
    await expect(exclusions.exclude(member, eventId, "20", "Motif")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(exclusions.exclude(officer, eventId, "20", " ")).rejects.toBeInstanceOf(ValidationError);
    await expect(exclusions.exclude(officer, eventId, "999", "Motif")).rejects.toThrow(/ne tombe pas/);
    await expect(exclusions.include(officer, eventId, "20", "Motif")).rejects.toThrow(/n'est pas exclu/);
    await exclusions.exclude(officer, eventId, "20", "Motif");
    await expect(exclusions.exclude(officer, eventId, "20", "Motif")).rejects.toThrow(/déjà exclu/);
  });
});
