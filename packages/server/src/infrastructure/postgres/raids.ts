import type { RaidRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function raidRepository(sql: SqlClient): RaidRepository {
  return {
    listAll() {
      return sql.query<{ id: string; name: string }>("select id, name from raids order by name");
    },
  };
}
