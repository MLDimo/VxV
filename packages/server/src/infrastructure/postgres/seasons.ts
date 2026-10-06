import type { SeasonRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";

interface SeasonRow {
  number: number;
  started_at: Date;
}

const toSeason = (row: SeasonRow) => ({ number: row.number, startedAt: row.started_at });

export function seasonRepository(sql: SqlClient): SeasonRepository {
  return {
    async current() {
      const [row] = await sql.query<SeasonRow>("select number, started_at from seasons order by number desc limit 1");
      return row && toSeason(row);
    },

    async start(startedBy, at) {
      const rows = await sql.query<SeasonRow>(
        `insert into seasons (number, started_at, started_by)
         select coalesce(max(number), 0) + 1, $2, $1 from seasons
         returning number, started_at`,
        [startedBy, at],
      );
      return toSeason(expectRow(rows, "start season"));
    },
  };
}
