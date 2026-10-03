import type { BossLootRepository } from "../../application/ports.ts";
import type { LootItem } from "../../domain/softReserves.ts";
import type { SqlClient } from "../sql.ts";

interface LootRow {
  item_id: number;
  name: string;
  raid_name: string;
  boss_name: string;
}

export function bossLootRepository(sql: SqlClient): BossLootRepository {
  return {
    async listForRaids(raidIds) {
      // An item dropped by several bosses is listed once, under its first boss.
      const rows = await sql.query<LootRow>(
        `select item_id, name, raid_name, boss_name from (
           select distinct on (items.id) items.id as item_id, items.name, raids.name as raid_name,
                  bosses.name as boss_name, bosses.position
           from boss_loot
           join bosses on bosses.encounter_id = boss_loot.encounter_id
           join raids on raids.id = bosses.raid_id
           join items on items.id = boss_loot.item_id
           where bosses.raid_id = any($1::text[])
           order by items.id, raids.name, bosses.position
         ) as loot
         order by raid_name, position, name`,
        [raidIds],
      );
      return rows.map((row): LootItem => ({
        itemId: row.item_id,
        name: row.name,
        raidName: row.raid_name,
        bossName: row.boss_name,
      }));
    },
  };
}
