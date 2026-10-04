import type { NewLoot, RaidRecordRepository } from "../../application/ports.ts";
import type { LootMethod } from "../../domain/history.ts";
import type { SqlClient } from "../sql.ts";

interface LootRow {
  encounter_id: number;
  item_id: number;
  character_id: string;
  method: LootMethod;
  looted_at: Date;
}

export function raidRecordRepository(sql: SqlClient): RaidRecordRepository {
  return {
    async recordAttendance(eventId, characterIds) {
      if (characterIds.length === 0) {
        return;
      }
      await sql.query(
        `insert into event_attendance (event_id, character_id) select $1, unnest($2::uuid[])
         on conflict do nothing`,
        [eventId, characterIds],
      );
    },

    async addLoots(eventId, loots) {
      if (loots.length === 0) {
        return [];
      }
      // Methods travel as text[]: drivers may not know the enum array type.
      const rows = await sql.query<LootRow>(
        `insert into loots (event_id, encounter_id, item_id, character_id, method, looted_at)
         select $1, encounter_id, item_id, character_id, method::loot_method, looted_at
         from unnest($2::int[], $3::int[], $4::uuid[], $5::text[], $6::timestamptz[])
           as give (encounter_id, item_id, character_id, method, looted_at)
         on conflict (event_id, encounter_id, item_id, looted_at) do nothing
         returning encounter_id, item_id, character_id, method::text as method, looted_at`,
        [
          eventId,
          loots.map((loot) => loot.encounterId),
          loots.map((loot) => loot.itemId),
          loots.map((loot) => loot.characterId),
          loots.map((loot) => loot.method),
          loots.map((loot) => loot.lootedAt),
        ],
      );
      return rows.map((row): NewLoot => ({
        encounterId: row.encounter_id,
        itemId: row.item_id,
        characterId: row.character_id,
        method: row.method,
        lootedAt: row.looted_at,
      }));
    },
  };
}
