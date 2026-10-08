import type { DuelRepository } from "../../application/ports.ts";
import type { Duel } from "../../domain/duels.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";
import { isUuid } from "./uuid.ts";

interface DuelRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  scheduled_at: Date;
  place: string;
  created_at: Date;
  accepted: boolean | null;
  bet_id: string | null;
  winner_id: string | null;
  played_at: Date | null;
  cancelled_at: Date | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
}

const SELECT_DUELS = `
  select id, challenger_id, opponent_id, scheduled_at, place, created_at, accepted, bet_id, winner_id, played_at,
         cancelled_at, discord_channel_id, discord_message_id
  from duels`;

function toDuel(row: DuelRow): Duel {
  return {
    id: row.id,
    challengerId: row.challenger_id,
    opponentId: row.opponent_id,
    scheduledAt: row.scheduled_at,
    place: row.place,
    createdAt: row.created_at,
    accepted: row.accepted ?? undefined,
    betId: row.bet_id ?? undefined,
    winnerId: row.winner_id ?? undefined,
    playedAt: row.played_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    discordMessage:
      row.discord_channel_id === null || row.discord_message_id === null
        ? undefined
        : { channelId: row.discord_channel_id, messageId: row.discord_message_id },
  };
}

export function duelRepository(sql: SqlClient): DuelRepository {
  return {
    async create(challengerId, duel, createdAt) {
      const rows = await sql.query<{ id: string }>(
        `insert into duels (challenger_id, opponent_id, scheduled_at, place, created_at)
         values ($1, $2, $3, $4, $5) returning id`,
        [challengerId, duel.opponentId, duel.scheduledAt, duel.place.trim(), createdAt],
      );
      return expectRow(rows, "create duel").id;
    },

    async findById(duelId) {
      if (!isUuid(duelId)) {
        return undefined;
      }
      const [row] = await sql.query<DuelRow>(`${SELECT_DUELS} where id = $1`, [duelId]);
      return row && toDuel(row);
    },

    async findByBet(betId) {
      if (!isUuid(betId)) {
        return undefined;
      }
      const [row] = await sql.query<DuelRow>(`${SELECT_DUELS} where bet_id = $1`, [betId]);
      return row && toDuel(row);
    },

    async listAll() {
      const rows = await sql.query<DuelRow>(`${SELECT_DUELS} order by scheduled_at desc`);
      return rows.map(toDuel);
    },

    async answer(duelId, accepted, at, betId) {
      await sql.query("update duels set accepted = $2, answered_at = $3, bet_id = $4 where id = $1", [
        duelId,
        accepted,
        at,
        betId ?? null,
      ]);
    },

    async recordWinner(duelId, winnerId, at) {
      await sql.query("update duels set winner_id = $2, played_at = $3 where id = $1", [duelId, winnerId, at]);
    },

    async cancel(duelId, at) {
      await sql.query("update duels set cancelled_at = $2 where id = $1", [duelId, at]);
    },

    async setDiscordMessage(duelId, { channelId, messageId }) {
      await sql.query("update duels set discord_channel_id = $2, discord_message_id = $3 where id = $1", [
        duelId,
        channelId,
        messageId,
      ]);
    },
  };
}
