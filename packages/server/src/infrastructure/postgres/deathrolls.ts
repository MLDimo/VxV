import type { DeathrollPlayer, DeathrollRepository, StoredDeathroll } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

interface DeathrollRow {
  id: string;
  stake: number;
  start_number: number;
  accepted_at: Date;
  ended_at: Date;
  loser_id: string;
  bet_id: string | null;
  paid_at: Date | null;
}

interface PlayerRow {
  character_id: string;
  name: string;
  class: string;
  member_id: string | null;
  member_name: string | null;
  member_class: string | null;
}

/** A player: the character, and its member shown by their main character, else by their Discord name. */
const PLAYER = (side: "challenger" | "challenged") => `
  ${side}.id as ${side}_character_id, ${side}.first_name || ' ' || ${side}.last_name as ${side}_name,
  ${side}.class as ${side}_class, ${side}.member_id as ${side}_member_id,
  coalesce(${side}_main.first_name || ' ' || ${side}_main.last_name, ${side}_member.discord_name) as ${side}_member_name,
  ${side}_main.class as ${side}_member_class`;
const PLAYER_JOINS = (side: "challenger" | "challenged") => `
  join characters ${side} on ${side}.id = deathrolls.${side}_id
  left join members ${side}_member on ${side}_member.id = ${side}.member_id
  left join characters ${side}_main on ${side}_main.member_id = ${side}.member_id and ${side}_main.is_main`;

function player(row: Record<string, unknown>, side: "challenger" | "challenged"): DeathrollPlayer {
  const field = (name: keyof PlayerRow) => row[`${side}_${name}`] as string | null;
  return {
    characterId: field("character_id") ?? "",
    name: field("name") ?? "",
    characterClass: field("class") ?? "",
    memberId: field("member_id") ?? undefined,
    memberName: field("member_name") ?? undefined,
    memberClass: field("member_class") ?? undefined,
  };
}

export function deathrollRepository(sql: SqlClient): DeathrollRepository {
  async function select(where: string, params: unknown[]): Promise<StoredDeathroll[]> {
    const rows = await sql.query<DeathrollRow & Record<string, unknown>>(
      `select deathrolls.id, deathrolls.stake, deathrolls.start_number, deathrolls.accepted_at, deathrolls.ended_at,
              deathrolls.loser_id, deathrolls.bet_id, deathrolls.paid_at, ${PLAYER("challenger")}, ${PLAYER("challenged")}
       from deathrolls ${PLAYER_JOINS("challenger")} ${PLAYER_JOINS("challenged")}
       ${where} order by deathrolls.ended_at desc, deathrolls.id`,
      params,
    );
    const rolls = await sql.query<{
      deathroll_id: string;
      character_id: string;
      high: number;
      result: number;
    }>(
      `select deathroll_id, character_id, high, result from deathroll_rolls
       where deathroll_id = any($1::text[]) order by deathroll_id, position`,
      [rows.map((row) => row.id)],
    );
    return rows.map((row) => ({
      id: row.id,
      challenger: player(row, "challenger"),
      challenged: player(row, "challenged"),
      stake: row.stake,
      start: row.start_number,
      acceptedAt: row.accepted_at,
      endedAt: row.ended_at,
      loserCharacterId: row.loser_id,
      betId: row.bet_id ?? undefined,
      paidAt: row.paid_at ?? undefined,
      rolls: rolls
        .filter((roll) => roll.deathroll_id === row.id)
        .map((roll) => ({ characterId: roll.character_id, high: roll.high, result: roll.result })),
    }));
  }

  return {
    async find(id) {
      const [found] = await select("where deathrolls.id = $1", [id]);
      return found;
    },

    async save(game, sentBy, recordedAt) {
      await sql.query(
        `insert into deathrolls (id, challenger_id, challenged_id, stake, start_number, accepted_at, ended_at, loser_id,
                                 bet_id, sent_by, recorded_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          game.id,
          game.challengerId,
          game.challengedId,
          game.stake,
          game.start,
          game.acceptedAt,
          game.endedAt,
          game.loserId,
          game.betId ?? null,
          sentBy,
          recordedAt,
        ],
      );
      await sql.query(
        `insert into deathroll_rolls (deathroll_id, position, character_id, high, result)
         select $1, roll.position, roll.character_id, roll.high, roll.result
         from unnest($2::uuid[], $3::integer[], $4::integer[]) with ordinality as roll(character_id, high, result, position)`,
        [
          game.id,
          game.rolls.map((roll) => roll.characterId),
          game.rolls.map((roll) => roll.high),
          game.rolls.map((roll) => roll.result),
        ],
      );
    },

    async markPaid(id, at) {
      const rows = await sql.query(
        "update deathrolls set paid_at = $2 where id = $1 and paid_at is null returning id",
        [id, at],
      );
      return rows.length > 0;
    },

    listAll() {
      return select("", []);
    },
  };
}
