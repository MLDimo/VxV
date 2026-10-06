import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GameChange } from "../domain/gameChanges.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonExport } from "./addonExport.ts";
import { createExclusions } from "./exclusions.ts";
import { createGameChanges } from "./gameChanges.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";

const NOW = new Date("2026-12-01T12:00:00Z");

describe("changes made in game", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let changes: ReturnType<typeof createGameChanges>;
  let signups: ReturnType<typeof createSignups>;
  let officer: Member;
  let member: Member;
  let eventId: string;
  let announced: string[];

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => NOW;
    announced = [];
    signups = createSignups({ unitOfWork, clock });
    changes = createGameChanges({
      unitOfWork,
      signups,
      softReserves: createSoftReserves({ unitOfWork, clock }),
      exclusions: createExclusions({ unitOfWork }),
      announcements: {
        announceQuietly: async (id) => {
          announced.push(id);
          return true;
        },
      },
    });
    officer = await createMember(sql, "officer", "Officier");
    member = await createMember(sql, "member", "Membre");
    const [deja, thom] = await createGuildCharacters(sql, "Ðéjà Vu", "Thom Leboss");
    const characters = characterRepository(sql);
    await characters.link(deja.id, officer.id);
    await characters.link(thom.id, member.id);
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    await database.close();
  });

  const signup = (id: string, author = "Thom Leboss"): GameChange => ({
    id,
    eventId,
    author,
    kind: "signup",
    role: "healer",
    spec: "Sacré",
    status: "present",
  });

  it("signs up the author as on the website, and updates the event's message on Discord", async () => {
    expect(await changes.receive(member, [signup("Thom Leboss#1#1")])).toEqual([
      {
        id: "Thom Leboss#1#1",
        eventId,
        author: "Thom Leboss",
        accepted: true,
        message: "Inscription enregistrée sur le site.",
      },
    ]);
    expect((await signups.listForEvent(eventId)).map((entry) => [entry.characterName, entry.spec])).toEqual([
      ["Thom Leboss", "Sacré"],
    ]);
    expect(announced).toEqual([eventId]);
  });

  it("does a change once, whoever sends it again, and tells what became of it", async () => {
    await changes.receive(member, [signup("Thom Leboss#1#1")]);
    const reserves: GameChange = {
      id: "Thom Leboss#2#1",
      eventId,
      author: "Thom Leboss",
      kind: "reserves",
      itemIds: [20, 99],
    };
    const [refused] = await changes.receive(member, [reserves]);
    expect(refused).toMatchObject({
      accepted: false,
      message: "Un des objets choisis ne tombe pas dans les raids de cet événement.",
    });
    expect(await changes.receive(officer, [signup("Thom Leboss#1#1"), reserves])).toEqual([
      expect.objectContaining({ id: "Thom Leboss#1#1", accepted: true }),
      refused,
    ]);
    expect(announced).toHaveLength(1);
  });

  it("lets an officer relay a member's change, but not a member another's", async () => {
    expect(await changes.receive(officer, [signup("Thom Leboss#1#1")])).toEqual([
      expect.objectContaining({ accepted: true }),
    ]);
    const other = await createMember(sql, "member", "Autre");
    expect(await changes.receive(other, [signup("Thom Leboss#5#1")])).toEqual([]);
  });

  it("refuses the change of a character linked to nobody, and forgets one of an unknown event", async () => {
    const [stranger] = await changes.receive(officer, [signup("Inconnu#1#1", "Inconnu Total")]);
    expect(stranger).toMatchObject({ accepted: false, message: expect.stringContaining("lié à aucun membre") });
    const lost = { ...signup("Thom Leboss#9#9"), eventId: "00000000-0000-0000-0000-000000000000" };
    expect(await changes.receive(member, [lost])).toEqual([]);
  });

  it("excludes an item for an officer, with the reason in the journal; a member is refused", async () => {
    const exclusion = (id: string, author: string): GameChange => ({
      id,
      eventId,
      author,
      kind: "exclusion",
      itemId: 20,
      excluded: true,
      reason: "Pour le tank principal",
    });
    expect(await changes.receive(member, [exclusion("Thom Leboss#3#1", "Thom Leboss")])).toEqual([
      expect.objectContaining({ accepted: false, message: "Cette action est réservée aux officiers." }),
    ]);
    expect(await changes.receive(officer, [exclusion("Ðéjà Vu#3#1", "Ðéjà Vu")])).toEqual([
      expect.objectContaining({ accepted: true, message: "Objet exclu des SR." }),
    ]);
  });

  it("goes back to the game with the event's data", async () => {
    await changes.receive(member, [signup("Thom Leboss#1#1")]);
    const text = await createAddonExport({ unitOfWork: createUnitOfWork(sql), clock: () => NOW }).exportEvent(
      officer,
      eventId,
    );
    expect(text.split("\n")).toContain("C;Thom Leboss#1#1;1;Inscription enregistrée sur le site.");
  });
});
