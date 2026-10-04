import type { RaidRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function raidRepository(sql: SqlClient): RaidRepository {
  return {
    listAll() {
      return sql.query<{ id: string; name: string }>("select id, name from raids order by name");
    },

    async listBosses(raidIds) {
      const rows = await sql.query<{ encounter_id: number; name: string }>(
        "select encounter_id, name from bosses where raid_id = any($1::text[]) order by raid_id, position",
        [raidIds],
      );
      return rows.map((row) => ({ encounterId: row.encounter_id, name: row.name }));
    },
  };
}
