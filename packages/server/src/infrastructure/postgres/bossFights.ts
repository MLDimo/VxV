import type { BossFightRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

interface BossFightRow {
  id: string;
  encounter_id: number;
  ended_at: Date;
  content: string;
  total_healing: string;
}

const toStored = (row: BossFightRow) => ({
  id: row.id,
  encounterId: row.encounter_id,
  endedAt: row.ended_at,
  content: row.content,
  totalHealing: Number(row.total_healing),
});

const COLUMNS = "id, encounter_id, ended_at, content, total_healing";

export function bossFightRepository(sql: SqlClient): BossFightRepository {
  return {
    async listEndedBetween(encounterId, from, to) {
      const rows = await sql.query<BossFightRow>(
        `select ${COLUMNS} from boss_fights where encounter_id = $1 and ended_at between $2 and $3`,
        [encounterId, from, to],
      );
      return rows.map(toStored);
    },

    async listEndedSince(since) {
      const rows = await sql.query<BossFightRow>(
        `select ${COLUMNS} from boss_fights where $1::timestamptz is null or ended_at >= $1 order by ended_at`,
        [since ?? null],
      );
      return rows.map(toStored);
    },

    async save(fight) {
      const values = [
        fight.encounterId,
        fight.endedAt,
        fight.content,
        fight.totalHealing,
        fight.sentBy,
        fight.receivedAt,
      ];
      if (fight.replacing === undefined) {
        await sql.query(
          `insert into boss_fights (encounter_id, ended_at, content, total_healing, sent_by, received_at)
           values ($1, $2, $3, $4, $5, $6)`,
          values,
        );
      } else {
        await sql.query(
          `update boss_fights set encounter_id = $1, ended_at = $2, content = $3, total_healing = $4, sent_by = $5,
             received_at = $6
           where id = $7`,
          [...values, fight.replacing],
        );
      }
    },
  };
}
