import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonExport } from "./addonExport.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createExclusions } from "./exclusions.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";

const NOW = new Date("2026-12-01T12:00:00Z");

describe("addon export", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let addonExport: ReturnType<typeof createAddonExport>;
  let officer: Member;
  let member: Member;
  let eventId: string;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => NOW;
    addonExport = createAddonExport({ unitOfWork, clock });
    officer = await createMember(sql, "officer", "Officier");
    member = await createMember(sql, "member", "Membre");
    const [deja, thom, ciel] = await createGuildCharacters(sql, "Ðéjà Vu", "Thom Leboss", "Ciel Gris");
    const characters = characterRepository(sql);
    await characters.link(deja.id, officer.id);
    await characters.link(thom.id, member.id);
    await characters.setMain(member.id, thom.id);
    await characters.link(ciel.id, member.id);
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
    const otherEventId = await createEvent(sql, officer, new Date("2026-12-17T20:00:00Z"), ["onyxia"]);

    const signups = createSignups({ unitOfWork, clock });
    await signups.signUp(member, eventId, { characterId: ciel.id, role: "tank", spec: "Protection", status: "late" });
    await createSoftReserves({ unitOfWork, clock }).setMine(member, eventId, ["20"]);
    const exclusions = createExclusions({ unitOfWork });
    await exclusions.exclude(officer, eventId, "21", "Pour le tank principal");
    await exclusions.exclude(officer, otherEventId, "10", "Une autre soirée");
  });

  afterEach(async () => {
    await database.close();
  });

  it("gives an officer the event with its officers, sign-ups, soft reserves and journal", async () => {
    const lines = (await addonExport.exportEvent(officer, eventId)).split("\n");
    expect(lines).toEqual([
      "VXV-RAID-1",
      `E;${eventId};1796932800;1796126400;1;Onyxia`,
      "O;Ðéjà Vu",
      "I;21;Sac en peau;Onyxia;1",
      "I;20;Tête d'Onyxia;Onyxia;0",
      "S;Ciel Gris;ROGUE;tank;late;1;Protection;20:0",
      expect.stringMatching(
        /^J;\d+;Officier;Objet exclu des SR : « Sac en peau » \(Onyxia, .*\);Pour le tank principal$/,
      ),
    ]);
  });

  it("gives any member's companion the next event, the soonest first", async () => {
    const next = await addonExport.exportNextEvent();
    expect(next).toMatchObject({ title: "Onyxia", startsAt: new Date("2026-12-10T20:00:00Z") });
    expect(next?.text).toBe(await addonExport.exportEvent(officer, eventId));
  });

  it("keeps the event being played a few hours after its start, then moves to the next one", async () => {
    const during = createAddonExport({
      unitOfWork: createUnitOfWork(sql),
      clock: () => new Date("2026-12-11T01:00:00Z"),
    });
    expect((await during.exportNextEvent())?.text).toContain(`E;${eventId};`);
    const after = createAddonExport({
      unitOfWork: createUnitOfWork(sql),
      clock: () => new Date("2026-12-11T03:00:00Z"),
    });
    expect((await after.exportNextEvent())?.startsAt).toEqual(new Date("2026-12-17T20:00:00Z"));
    const later = createAddonExport({
      unitOfWork: createUnitOfWork(sql),
      clock: () => new Date("2027-01-01T00:00:00Z"),
    });
    expect(await later.exportNextEvent()).toBeUndefined();
  });

  it("is refused to a member, and to an unknown event", async () => {
    await expect(addonExport.exportEvent(member, eventId)).rejects.toThrow(ForbiddenError);
    await expect(addonExport.exportEvent(officer, "00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      ValidationError,
    );
  });
});
