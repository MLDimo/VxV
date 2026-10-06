import type { GameChangeRepository } from "../../application/ports.ts";
import type { GameChangeOutcome } from "../../domain/gameChanges.ts";
import type { SqlClient } from "../sql.ts";

interface OutcomeRow {
  id: string;
  event_id: string;
  author: string;
  accepted: boolean;
  message: string;
}

const COLUMNS = "id, event_id, author, accepted, message";

function toOutcome(row: OutcomeRow): GameChangeOutcome {
  return { id: row.id, eventId: row.event_id, author: row.author, accepted: row.accepted, message: row.message };
}

export function gameChangeRepository(sql: SqlClient): GameChangeRepository {
  return {
    async find(changeId) {
      const [row] = await sql.query<OutcomeRow>(`select ${COLUMNS} from game_changes where id = $1`, [changeId]);
      return row && toOutcome(row);
    },

    async save(outcome, sentBy) {
      await sql.query(
        `insert into game_changes (id, event_id, author, accepted, message, sent_by) values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do nothing`,
        [outcome.id, outcome.eventId, outcome.author, outcome.accepted, outcome.message, sentBy],
      );
    },

    async listByEvent(eventId) {
      const rows = await sql.query<OutcomeRow>(
        `select ${COLUMNS} from game_changes where event_id = $1 order by received_at, id`,
        [eventId],
      );
      return rows.map(toOutcome);
    },
  };
}
