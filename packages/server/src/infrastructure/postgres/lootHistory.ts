import type { LootHistoryRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function lootHistoryRepository(sql: SqlClient): LootHistoryRepository {
  return {
    async countSignedUpOwners(eventId) {
      const rows = await sql.query<{ item_id: number; owners: number }>(
        `select loots.item_id, count(distinct loots.character_id)::int as owners
         from loots
         join signups on signups.character_id = loots.character_id and signups.event_id = $1
         group by loots.item_id`,
        [eventId],
      );
      return new Map(rows.map((row) => [row.item_id, row.owners]));
    },
  };
}
