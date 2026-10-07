import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createCharacters } from "./characters.ts";
import { ValidationError } from "./errors.ts";

describe("character linking", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let characters: ReturnType<typeof createCharacters>;
  let me: Member;
  let other: Member;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    characters = createCharacters({ unitOfWork: createUnitOfWork(sql) });
    me = await createMember(sql, "member", "Moi");
    other = await createMember(sql, "member", "Autre");
  });

  afterEach(async () => {
    await database.close();
  });

  const mine = async () =>
    (await characters.listMine(me)).map((character) => `${character.firstName}${character.isMain ? " (main)" : ""}`);

  it("links a main and rerolls, main listed first", async () => {
    const [deja, eole, suis] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes", "Suis Surtescotes");
    await characters.link(me, eole.id, false);
    await characters.link(me, suis.id, true);
    await characters.link(me, deja.id, false);
    expect(await mine()).toEqual(["Suis (main)", "Eole", "Ðéjà"]);
  });

  it("keeps a single main when another character becomes main", async () => {
    const [deja, eole] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes");
    await characters.link(me, deja.id, true);
    await characters.link(me, eole.id, true);
    expect(await mine()).toEqual(["Eole (main)", "Ðéjà"]);
    await characters.setMain(me, deja.id);
    expect(await mine()).toEqual(["Ðéjà (main)", "Eole"]);
  });

  it("offers only guild characters that nobody has claimed", async () => {
    const [deja, eole, suis] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes", "Suis Surtescotes");
    await characters.link(other, deja.id, true);
    await characterRepository(sql).setInGuild([eole.id], false);
    expect((await characters.listAvailable()).map((character) => character.id)).toEqual([suis.id]);
  });

  it("refuses a character already linked to another member", async () => {
    const [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await characters.link(other, deja.id, true);
    await expect(characters.link(me, deja.id, false)).rejects.toThrow(ValidationError);
    expect(await mine()).toEqual([]);
  });

  it("refuses a character that left the guild, and an unknown or malformed id", async () => {
    const [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await characterRepository(sql).setInGuild([deja.id], false);
    await expect(characters.link(me, deja.id, false)).rejects.toThrow(/ne fait pas partie de la guilde/);
    await expect(characters.link(me, "00000000-0000-0000-0000-000000000000", false)).rejects.toThrow(/introuvable/);
    await expect(characters.link(me, "not-an-id", false)).rejects.toThrow(/introuvable/);
  });

  it("unlinks a character, which becomes available again", async () => {
    const [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await characters.link(me, deja.id, true);
    await characters.unlink(me, deja.id);
    expect(await mine()).toEqual([]);
    expect((await characters.listAvailable()).map((character) => character.id)).toEqual([deja.id]);
  });

  it("refuses to change or unlink the character of another member", async () => {
    const [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await characters.link(other, deja.id, true);
    await expect(characters.setMain(me, deja.id)).rejects.toThrow(/ne vous appartient pas/);
    await expect(characters.unlink(me, deja.id)).rejects.toThrow(/ne vous appartient pas/);
  });

  it("keeps how the member's own characters look in game, for the avatars", async () => {
    const [deja, eole, thom] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes", "Thom Leboss");
    await characters.link(me, deja.id, true);
    await characters.link(me, eole.id, false);
    await characters.link(other, thom.id, true);
    const kept = await characters.recordAppearances(me, [
      { name: "Ðéjà Vu", race: "Scourge", sex: 3 },
      { name: "Eole Hermes", race: "Orc", sex: 1 },
      { name: "Thom Leboss", race: "Tauren", sex: 2 },
      { name: "Inconnu Total", race: "Troll", sex: 2 },
    ]);
    expect(kept).toBe(1);
    const rows = await sql.query<{ first_name: string; race: string | null; sex: string | null }>(
      "select first_name, race, sex from characters order by first_name",
    );
    expect(rows).toEqual([
      { first_name: "Eole", race: null, sex: null },
      { first_name: "Thom", race: null, sex: null },
      { first_name: "Ðéjà", race: "Scourge", sex: "female" },
    ]);
  });
});
