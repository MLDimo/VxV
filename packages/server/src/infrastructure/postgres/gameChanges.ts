import type { GameChangeRepository } from "../../application/ports.ts";
import type { GameChangeOutcome } from "../../domain/gameChanges.ts";
import type { SqlClient } from "../sql.ts";

interface OutcomeRow {
  id: string;
  event_id: string | null;
  bet_id: string | null;
  duel_id: string | null;
  mission_id: string | null;
  author: string;
  accepted: boolean;
  message: string;
}

const COLUMNS = "id, event_id, bet_id, duel_id, mission_id, author, accepted, message";
/** A change about nothing stored: what is created in game, refused. */
const UNSCOPED = "num_nonnulls(event_id, bet_id, duel_id, mission_id) = 0";

function toOutcome(row: OutcomeRow): GameChangeOutcome {
  return {
    id: row.id,
    eventId: row.event_id ?? undefined,
    betId: row.bet_id ?? undefined,
    duelId: row.duel_id ?? undefined,
    missionId: row.mission_id ?? undefined,
    author: row.author,
    accepted: row.accepted,
    message: row.message,
  };
}

export function gameChangeRepository(sql: SqlClient): GameChangeRepository {
  return {
    async find(changeId) {
      const [row] = await sql.query<OutcomeRow>(`select ${COLUMNS} from game_changes where id = $1`, [changeId]);
      return row && toOutcome(row);
    },

    async save(outcome, sentBy, receivedAt) {
      await sql.query(
        `insert into game_changes
           (id, event_id, bet_id, duel_id, mission_id, author, accepted, message, sent_by, received_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (id) do nothing`,
        [
          outcome.id,
          outcome.eventId ?? null,
          outcome.betId ?? null,
          outcome.duelId ?? null,
          outcome.missionId ?? null,
          outcome.author,
          outcome.accepted,
          outcome.message,
          sentBy,
          receivedAt,
        ],
      );
    },

    async listForEvent(eventId, createdSince) {
      const rows = await sql.query<OutcomeRow>(
        `select ${COLUMNS} from game_changes
         where event_id = $1 or (${UNSCOPED} and received_at >= $2)
         order by received_at, id`,
        [eventId, createdSince],
      );
      return rows.map(toOutcome);
    },

    async listForPvp(eventIds, duelIds) {
      const rows = await sql.query<OutcomeRow>(
        `select ${COLUMNS} from game_changes where event_id = any($1::uuid[]) or duel_id = any($2::uuid[])
         order by received_at, id`,
        [eventIds, duelIds],
      );
      return rows.map(toOutcome);
    },

    async listForMissions(missionIds, createdSince) {
      const rows = await sql.query<OutcomeRow>(
        `select ${COLUMNS} from game_changes
         where mission_id = any($1::uuid[]) or (${UNSCOPED} and received_at >= $2)
         order by received_at, id`,
        [missionIds, createdSince],
      );
      return rows.map(toOutcome);
    },

    async listForBets(betIds) {
      const rows = await sql.query<OutcomeRow>(
        `select ${COLUMNS} from game_changes where bet_id = any($1::uuid[]) order by received_at, id`,
        [betIds],
      );
      return rows.map(toOutcome);
    },
  };
}
