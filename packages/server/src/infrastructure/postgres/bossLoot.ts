import type { BossLootRepository } from "../../application/ports.ts";
import type { LootItem } from "../../domain/softReserves.ts";
import type { SqlClient } from "../sql.ts";

interface LootRow {
  item_id: number;
  name: string;
  raid_name: string;
  boss_name: string;
  item_class: number | null;
  item_subclass: number | null;
  equip_slot: string | null;
}

export function bossLootRepository(sql: SqlClient): BossLootRepository {
  return {
    async listForRaids(raidIds) {
      // An item dropped by several bosses is listed once, under its first boss.
      const rows = await sql.query<LootRow>(
        `select item_id, name, raid_name, boss_name, item_class, item_subclass, equip_slot from (
           select distinct on (items.id) items.id as item_id, items.name, raids.name as raid_name,
                  bosses.name as boss_name, bosses.position, items.item_class, items.item_subclass, items.equip_slot
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
        kind:
          row.item_class === null || row.item_subclass === null
            ? undefined
            : { itemClass: row.item_class, itemSubclass: row.item_subclass, equipSlot: row.equip_slot ?? "" },
      }));
    },
  };
}
