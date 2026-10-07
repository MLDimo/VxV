import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PROFESSIONS_HEADER } from "../domain/artisans.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonArtisans } from "./addonArtisans.ts";
import { createArtisans } from "./artisans.ts";

const READ = 1796904000;

/** A character's first aid as the addon writes it: its level, read at an instant, and its recipes when given. */
function firstAid(name: string, level: number, at: number, recipes?: readonly string[]): string {
  return [
    PROFESSIONS_HEADER,
    `C;${name}`,
    `P;129;Secourisme;${String(level)};75;${String(at)};${recipes === undefined ? "0" : String(at)}`,
    ...(recipes ?? []).map((recipe) => `R;129;${recipe}`),
  ].join("\n");
}

describe("artisans directory", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let artisans: ReturnType<typeof createArtisans>;
  let sira: Member;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    artisans = createArtisans({ unitOfWork: createUnitOfWork(sql) });
    sira = await createMember(sql, "member", "Sira");
    const [ventargent, cendrelune] = await createGuildCharacters(sql, "Sira Ventargent", "Vorn Cendrelune");
    await characterRepository(sql).link(ventargent.id, sira.id);
    await characterRepository(sql).link(cendrelune.id, (await createMember(sql, "member", "Vorn")).id);
  });

  afterEach(async () => {
    await database.close();
  });

  it("keeps the latest level and the latest recipes, a level read without its recipes keeping them", async () => {
    expect(
      await artisans.recordFromGame(sira, [
        firstAid("Sira Ventargent", 22, READ, ["3275;Bandage en lin", "1244431;Potion de soins mineure"]),
      ]),
    ).toBe(1);
    // An older reading changes nothing; a newer level without recipes keeps the recipes known.
    expect(
      await artisans.recordFromGame(sira, [firstAid("Sira Ventargent", 10, READ - 60, ["3275;Bandage en lin"])]),
    ).toBe(0);
    expect(await artisans.recordFromGame(sira, [firstAid("Sira Ventargent", 30, READ + 60)])).toBe(1);
    const [entry] = await artisans.directory();
    expect(entry).toMatchObject({ characterName: "Sira Ventargent", name: "Secourisme", level: 30, maxLevel: 75 });
    expect(entry?.recipesReadAt).toEqual(new Date(READ * 1000));
    const found = await artisans.search("potion SOINS");
    expect(found.map(({ recipe, crafters }) => [recipe.name, crafters.map((crafter) => crafter.level)])).toEqual([
      ["Potion de soins mineure", [30]],
    ]);
    // Recipes read later replace the known ones.
    await artisans.recordFromGame(sira, [firstAid("Sira Ventargent", 30, READ + 120, ["3275;Bandage en lin"])]);
    expect((await artisans.search("potion"))[0]?.crafters).toEqual([]);
  });

  it("takes from a member their own characters only", async () => {
    expect(await artisans.recordFromGame(sira, [firstAid("Vorn Cendrelune", 50, READ, [])])).toBe(0);
    expect(await artisans.directory()).toEqual([]);
  });

  it("hands the directory to the addon: professions, the recipes known and who knows them", async () => {
    await artisans.recordFromGame(sira, [firstAid("Sira Ventargent", 22, READ, ["3275;Bandage en lin"])]);
    const text = await createAddonArtisans({
      unitOfWork: createUnitOfWork(sql),
      clock: () => new Date("2026-12-10T13:00:00Z"),
    }).exportArtisans();
    expect(text.split("\n")).toEqual([
      "VXV-ARTISANS-1",
      "P;1796907600",
      "M;" + sira.id + ";Sira Ventargent",
      expect.stringMatching(/^M;[0-9a-f-]+;Vorn Cendrelune$/),
      `A;Sira Ventargent;ROGUE;129;Secourisme;22;75;${String(READ)};${String(READ)}`,
      "K;3275;129;Bandage en lin",
      "R;Sira Ventargent;129;3275",
    ]);
  });
});
