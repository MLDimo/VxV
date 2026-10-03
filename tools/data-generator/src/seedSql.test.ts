import type { PGliteInterface } from "@electric-sql/pglite";
import type { Raid } from "@vxv/raid-data";
import { createMigratedDatabase } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderSeedSql, SEED_SQL_PATH } from "./seedSql.ts";
import { onyxia, salleDesThanes } from "./test/raids.ts";

describe("renderSeedSql", () => {
  it("is written to the database folder", () => {
    expect(renderSeedSql([onyxia]).path).toBe(SEED_SQL_PATH);
  });

  it("produces an empty transaction when there is no raid", () => {
    expect(renderSeedSql([]).content).toContain("begin;\ncommit;");
  });
});

describe("renderSeedSql applied to a migrated database", () => {
  let database: PGliteInterface;

  beforeEach(async () => {
    database = await createMigratedDatabase();
  });

  afterEach(async () => {
    await database.close();
  });

  async function sync(raids: readonly Raid[]): Promise<void> {
    await database.exec(renderSeedSql(raids).content);
  }

  async function select<T>(sql: string): Promise<T[]> {
    return (await database.query<T>(sql)).rows;
  }

  async function snapshot(): Promise<unknown> {
    return {
      raids: await select("select id, name, instance_id from raids order by id"),
      bosses: await select("select encounter_id, raid_id, name, position from bosses order by encounter_id"),
      items: await select("select id, name from items order by id"),
      loot: await select("select encounter_id, item_id from boss_loot order by encounter_id, item_id"),
    };
  }

  it("inserts raids, bosses in kill order, items and loot, apostrophes included", async () => {
    await sync([onyxia, salleDesThanes]);
    expect(await snapshot()).toEqual({
      raids: [
        { id: "onyxia", name: "Repaire d'Onyxia", instance_id: 249 },
        { id: "salle-des-thanes", name: "La salle des Thanes", instance_id: 3065 },
      ],
      bosses: [
        { encounter_id: 1084, raid_id: "onyxia", name: "Onyxia", position: 1 },
        { encounter_id: 3493, raid_id: "salle-des-thanes", name: "Faldrim Courbenclume", position: 1 },
        { encounter_id: 3495, raid_id: "salle-des-thanes", name: "Infurnus", position: 2 },
      ],
      items: [
        { id: 17966, name: "Sac en peau d'Onyxia" },
        { id: 18423, name: "Tête d'Onyxia" },
        { id: 271095, name: "Croc de Magmatus" },
        { id: 271096, name: "Brassards brindecieux" },
      ],
      loot: [
        { encounter_id: 1084, item_id: 17966 },
        { encounter_id: 1084, item_id: 18423 },
        { encounter_id: 3493, item_id: 271096 },
        { encounter_id: 3495, item_id: 271095 },
      ],
    });
  });

  it("can run twice with the same result", async () => {
    await sync([onyxia, salleDesThanes]);
    const first = await snapshot();
    await sync([onyxia, salleDesThanes]);
    expect(await snapshot()).toEqual(first);
  });

  it("applies reordered bosses, renamed items, removed loot and removed bosses", async () => {
    await sync([onyxia, salleDesThanes]);
    const [faldrim, infurnus] = salleDesThanes.bosses;
    if (!faldrim || !infurnus) {
      throw new Error("fixture needs two bosses");
    }
    const edited: Raid = {
      ...salleDesThanes,
      bosses: [{ ...infurnus, loot: [{ itemId: 271095, name: "Croc de Magmatus (renommé)" }] }],
    };
    await sync([onyxia, edited]);
    const bosses = await select("select encounter_id, position from bosses where raid_id = 'salle-des-thanes'");
    expect(bosses).toEqual([{ encounter_id: 3495, position: 1 }]);
    expect(await select("select name from items where id = 271095")).toEqual([{ name: "Croc de Magmatus (renommé)" }]);
    expect(await select("select item_id from boss_loot where encounter_id = 3493")).toEqual([]);
  });

  it("leaves raids missing from the files untouched", async () => {
    await sync([onyxia, salleDesThanes]);
    await sync([salleDesThanes]);
    expect(await select("select id from raids where id = 'onyxia'")).toEqual([{ id: "onyxia" }]);
  });

  it("refuses to remove a boss whose loot history exists", async () => {
    await sync([salleDesThanes]);
    await database.exec(`
      insert into members (id, discord_id, discord_name) values ('00000000-0000-0000-0000-000000000001', '1', 'Officier');
      insert into characters (id, first_name, last_name, class) values ('00000000-0000-0000-0000-000000000002', 'Ðéjà', 'Vu', 'ROGUE');
      insert into events (id, starts_at, created_by) values ('00000000-0000-0000-0000-000000000003', now(), '00000000-0000-0000-0000-000000000001');
      insert into loots (event_id, encounter_id, item_id, character_id, method, looted_at)
        values ('00000000-0000-0000-0000-000000000003', 3493, 271096, '00000000-0000-0000-0000-000000000002', 'free_roll', now());
    `);
    const withoutFaldrim: Raid = { ...salleDesThanes, bosses: salleDesThanes.bosses.slice(1) };
    await expect(sync([withoutFaldrim])).rejects.toThrow(/foreign key/);
  });
});
