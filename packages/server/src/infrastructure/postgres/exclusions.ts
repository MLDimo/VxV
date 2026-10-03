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
  };
}
