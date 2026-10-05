import type { SyncMarkRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function syncMarkRepository(sql: SqlClient): SyncMarkRepository {
  return {
    async find(kind) {
      const [row] = await sql.query<{ captured_at: Date }>("select captured_at from sync_marks where kind = $1", [
        kind,
      ]);
      return row && new Date(row.captured_at);
    },

    async save(kind, capturedAt) {
      await sql.query(
        `insert into sync_marks (kind, captured_at) values ($1, $2)
         on conflict (kind) do update set captured_at = excluded.captured_at`,
        [kind, capturedAt],
      );
    },
  };
}
