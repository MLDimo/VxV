import type { Raid } from "@vxv/raid-data";
import type { OutputFile } from "./outputFile.ts";

export const SEED_SQL_PATH = "dist/generated/database/raid-data.sql";

function text(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function integer(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${value} is not an integer`);
  }
  return String(value);
}

function rows(values: readonly string[][]): string {
  return values.map((row) => `(${row.join(", ")})`).join(",\n  ");
}

function syncStatements(raids: readonly Raid[]): string[] {
  const raidIds = raids.map((raid) => text(raid.id)).join(", ");
  const bosses = raids.flatMap((raid) => raid.bosses.map((boss, index) => ({ raid, boss, position: index + 1 })));
  const items = new Map(bosses.flatMap(({ boss }) => boss.loot.map((item) => [item.itemId, item.name] as const)));
  const loot = bosses.flatMap(({ boss }) => boss.loot.map((item) => [integer(boss.encounterId), integer(item.itemId)]));

  return [
    `insert into raids (id, name, instance_id) values
  ${rows(raids.map((raid) => [text(raid.id), text(raid.name), integer(raid.instanceId)]))}
on conflict (id) do update set name = excluded.name, instance_id = excluded.instance_id;`,
    `insert into items (id, name) values
  ${rows([...items].map(([id, name]) => [integer(id), text(name)]))}
on conflict (id) do update set name = excluded.name;`,
    `delete from bosses where raid_id in (${raidIds})
  and encounter_id not in (${bosses.map(({ boss }) => integer(boss.encounterId)).join(", ")});`,
    `insert into bosses (encounter_id, raid_id, name, position) values
  ${rows(bosses.map(({ raid, boss, position }) => [integer(boss.encounterId), text(raid.id), text(boss.name), integer(position)]))}
on conflict (encounter_id) do update set raid_id = excluded.raid_id, name = excluded.name, position = excluded.position;`,
    `delete from boss_loot where encounter_id in (select encounter_id from bosses where raid_id in (${raidIds}));`,
    `insert into boss_loot (encounter_id, item_id) values
  ${rows(loot)};`,
  ];
}

/**
 * Idempotent script that aligns the database with the raid files, in one transaction.
 * Raids missing from the files are left untouched; a boss that already has recorded loots
 * cannot be removed (foreign key), which protects the history.
 */
export function renderSeedSql(raids: readonly Raid[]): OutputFile {
  const statements = raids.length > 0 ? syncStatements(raids) : [];
  const content = [
    "-- Generated from data/raids by @vxv/data-generator. Do not edit.",
    "begin;",
    ...statements,
    "commit;",
    "",
  ].join("\n");
  return { path: SEED_SQL_PATH, content };
}
