import type { ExclusionRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function exclusionRepository(sql: SqlClient): ExclusionRepository {
  return {
    async listByEvent(eventId) {
      const rows = await sql.query<{ item_id: number }>("select item_id from exclusions where event_id = $1", [
        eventId,
      ]);
      return new Set(rows.map((row) => row.item_id));
    },

    async add(eventId, itemId) {
      await sql.query("insert into exclusions (event_id, item_id) values ($1, $2)", [eventId, itemId]);
    },

    async remove(eventId, itemId) {
      await sql.query("delete from exclusions where event_id = $1 and item_id = $2", [eventId, itemId]);
    },
  };
}
