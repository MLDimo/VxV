import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ROSTER_HEADER, RosterFormatError } from "../domain/roster.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createJournal } from "./journal.ts";
import { createRoster } from "./roster.ts";

const roster = (...lines: string[]) => [ROSTER_HEADER, ...lines].join("\n");

describe("roster import", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let importRoster: ReturnType<typeof createRoster>["importRoster"];
  let listJournal: ReturnType<typeof createJournal>["listRecent"];

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    importRoster = createRoster({ unitOfWork }).importRoster;
    listJournal = createJournal({ unitOfWork }).listRecent;
  });

  afterEach(async () => {
    await database.close();
  });

  const characters = () =>
    sql.query<{ first_name: string; class: string; in_guild: boolean }>(
      "select first_name, class, in_guild from characters order by first_name",
    );

  it("adds the guild characters and records the import in the journal", async () => {
    const officer = await createMember(sql, "officer", "Officier");
    const summary = await importRoster(officer, roster("Ðéjà;Vu;ROGUE", "Eole;Hermes;WARRIOR"), "Mise à jour");
    expect(summary).toEqual({
      added: ["Ðéjà Vu", "Eole Hermes"],
      left: [],
      rejoined: [],
      classChanged: [],
      inGuild: 2,
    });
    expect(await characters()).toEqual([
      { first_name: "Eole", class: "WARRIOR", in_guild: true },
      { first_name: "Ðéjà", class: "ROGUE", in_guild: true },
    ]);
    expect(await listJournal()).toEqual([
      expect.objectContaining({
        actorName: "Officier",
        action: "roster.import",
        reason: "Mise à jour",
        after: summary,
      }),
    ]);
  });

  it("applies departures, returns and class changes on the next import", async () => {
    const officer = await createMember(sql, "gm");
    await importRoster(officer, roster("Ðéjà;Vu;ROGUE", "Eole;Hermes;WARRIOR"), "Première liste");
    await importRoster(officer, roster("Ðéjà;Vu;MAGE"), "Départ d'Eole");
    const summary = await importRoster(officer, roster("Ðéjà;Vu;MAGE", "Eole;Hermes;WARRIOR"), "Retour d'Eole");
    expect(summary.rejoined).toEqual(["Eole Hermes"]);
    expect(await characters()).toEqual([
      { first_name: "Eole", class: "WARRIOR", in_guild: true },
      { first_name: "Ðéjà", class: "MAGE", in_guild: true },
    ]);
    expect((await listJournal()).map((entry) => entry.reason)).toEqual([
      "Retour d'Eole",
      "Départ d'Eole",
      "Première liste",
    ]);
  });

  it.each(["member", "treasurer"] as const)("refuses the import to a %s", async (role) => {
    const member = await createMember(sql, role);
    await expect(importRoster(member, roster("Ðéjà;Vu;ROGUE"), "Motif")).rejects.toBeInstanceOf(ForbiddenError);
    expect(await characters()).toEqual([]);
  });

  it("requires a reason", async () => {
    const officer = await createMember(sql, "officer");
    await expect(importRoster(officer, roster("Ðéjà;Vu;ROGUE"), "   ")).rejects.toBeInstanceOf(ValidationError);
  });

  it("changes nothing when the roster is malformed", async () => {
    const officer = await createMember(sql, "officer");
    await expect(importRoster(officer, "not a roster", "Motif")).rejects.toBeInstanceOf(RosterFormatError);
    expect(await characters()).toEqual([]);
    expect(await listJournal()).toEqual([]);
  });

  describe("from an officer's companion", () => {
    let fromCompanion: ReturnType<typeof createRoster>["importFromCompanion"];
    const at = (minute: number) => new Date(Date.UTC(2026, 9, 6, 20, minute));
    const guild = (count: number) => Array.from({ length: count }, (_, index) => `Membre;N${String(index)};ROGUE`);

    beforeEach(() => {
      fromCompanion = createRoster({ unitOfWork: createUnitOfWork(sql) }).importFromCompanion;
    });

    it("imports a roster that changes something, and journals it as the companion's", async () => {
      const officer = await createMember(sql, "officer", "Officier");
      const outcome = await fromCompanion(officer, roster("Ðéjà;Vu;ROGUE"), at(0));
      expect(outcome).toEqual({ kind: "imported", summary: expect.objectContaining({ added: ["Ðéjà Vu"] }) });
      expect((await listJournal())[0]).toMatchObject({
        action: "roster.import",
        reason: "Liste de guilde envoyée par le compagnon",
      });
    });

    it("journals nothing for the same roster sent again, by another officer", async () => {
      const officer = await createMember(sql, "officer", "Officier");
      const other = await createMember(sql, "gm", "Maître");
      await fromCompanion(officer, roster("Ðéjà;Vu;ROGUE"), at(0));
      expect(await fromCompanion(other, roster("Ðéjà;Vu;ROGUE"), at(5))).toEqual({ kind: "unchanged" });
      expect(await listJournal()).toHaveLength(1);
    });

    it("ignores a copy older than the last one imported", async () => {
      const officer = await createMember(sql, "officer", "Officier");
      await fromCompanion(officer, roster("Ðéjà;Vu;ROGUE", "Eole;Hermes;WARRIOR"), at(10));
      expect(await fromCompanion(officer, roster("Ðéjà;Vu;ROGUE"), at(5))).toEqual({ kind: "older" });
      expect((await characters()).every((character) => character.in_guild)).toBe(true);
    });

    it("refuses a roster that would empty the guild, read before the client knew it all", async () => {
      const officer = await createMember(sql, "officer", "Officier");
      await fromCompanion(officer, roster(...guild(100)), at(0));
      expect(await fromCompanion(officer, roster(...guild(89)), at(5))).toEqual({ kind: "incomplete", departures: 11 });
      expect(await fromCompanion(officer, roster(...guild(90)), at(6))).toMatchObject({ kind: "imported" });
    });

    it("is reserved to the officers", async () => {
      const member = await createMember(sql, "member", "Membre");
      await expect(fromCompanion(member, roster("Ðéjà;Vu;ROGUE"), at(0))).rejects.toThrow(ForbiddenError);
    });
  });
});
