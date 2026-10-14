import type { ChifoumiRepository, StoredChifoumi } from "../../application/ports.ts";
import type { ChifoumiMove } from "../../domain/chifoumis.ts";
import type { SqlClient } from "../sql.ts";
import { gamePlayer, PLAYER_COLUMNS, PLAYER_JOINS } from "./gamePlayers.ts";

interface ChifoumiRow {
  id: string;
  stake: number;
  accepted_at: Date;
  ended_at: Date;
  loser_id: string;
  bet_id: string | null;
  paid_at: Date | null;
}

export function chifoumiRepository(sql: SqlClient): ChifoumiRepository {
  async function select(where: string, params: unknown[]): Promise<StoredChifoumi[]> {
    const rows = await sql.query<ChifoumiRow & Record<string, unknown>>(
      `select chifoumis.id, chifoumis.stake, chifoumis.accepted_at, chifoumis.ended_at, chifoumis.loser_id,
              chifoumis.bet_id, chifoumis.paid_at, ${PLAYER_COLUMNS("challenger")}, ${PLAYER_COLUMNS("challenged")}
       from chifoumis ${PLAYER_JOINS("chifoumis", "challenger")} ${PLAYER_JOINS("chifoumis", "challenged")}
       ${where} order by chifoumis.ended_at desc, chifoumis.id`,
      params,
    );
    const rounds = await sql.query<{
      chifoumi_id: string;
      challenger_move: ChifoumiMove;
      challenged_move: ChifoumiMove;
    }>(
      `select chifoumi_id, challenger_move, challenged_move from chifoumi_rounds
       where chifoumi_id = any($1::text[]) order by chifoumi_id, position`,
      [rows.map((row) => row.id)],
    );
    return rows.map((row) => ({
      id: row.id,
      challenger: gamePlayer(row, "challenger"),
      challenged: gamePlayer(row, "challenged"),
      stake: row.stake,
      acceptedAt: row.accepted_at,
      endedAt: row.ended_at,
      loserCharacterId: row.loser_id,
      betId: row.bet_id ?? undefined,
      paidAt: row.paid_at ?? undefined,
      rounds: rounds
        .filter((round) => round.chifoumi_id === row.id)
        .map((round) => ({ challenger: round.challenger_move, challenged: round.challenged_move })),
    }));
  }

  return {
    async find(id) {
      const [found] = await select("where chifoumis.id = $1", [id]);
      return found;
    },

    async save(game, sentBy, recordedAt) {
      await sql.query(
        `insert into chifoumis (id, challenger_id, challenged_id, stake, accepted_at, ended_at, loser_id, bet_id, sent_by,
                                recorded_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          game.id,
          game.challengerId,
          game.challengedId,
          game.stake,
          game.acceptedAt,
          game.endedAt,
          game.loserId,
          game.betId ?? null,
          sentBy,
          recordedAt,
        ],
      );
      await sql.query(
        `insert into chifoumi_rounds (chifoumi_id, position, challenger_move, challenged_move)
         select $1, round.position, round.challenger_move, round.challenged_move
         from unnest($2::text[], $3::text[]) with ordinality as round(challenger_move, challenged_move, position)`,
        [game.id, game.rounds.map((round) => round.challenger), game.rounds.map((round) => round.challenged)],
      );
    },

    async markPaid(id, at) {
      const rows = await sql.query("update chifoumis set paid_at = $2 where id = $1 and paid_at is null returning id", [
        id,
        at,
      ]);
      return rows.length > 0;
    },

    listAll() {
      return select("", []);
    },
  };
}
