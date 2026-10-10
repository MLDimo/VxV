import type { SchedulerRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function schedulerRepository(sql: SqlClient): SchedulerRepository {
  return {
    async token() {
      const [row] = await sql.query<{ token: string }>("select token from scheduler");
      if (row === undefined) {
        throw new Error("The scheduler's token is missing: the migrations insert it.");
      }
      return row.token;
    },
  };
}
