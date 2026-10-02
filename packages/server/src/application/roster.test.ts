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
});
