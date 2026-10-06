import type { BetRepository, StakeRepository } from "../../application/ports.ts";
import type { Bet, BetChoice, Stake } from "../../domain/bets.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";
import { isUuid } from "./uuid.ts";

interface BetRow {
  id: string;
  title: string;
  closes_at: Date;
  created_at: Date;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  choices: BetChoice[];
}

const SELECT_BETS = `
  select bets.id, bets.title, bets.closes_at, bets.created_at, bets.discord_channel_id, bets.discord_message_id,
         json_agg(json_build_object('id', bet_choices.id, 'label', bet_choices.label)
                  order by bet_choices.position) as choices
  from bets join bet_choices on bet_choices.bet_id = bets.id`;

function toBet(row: BetRow): Bet {
  return {
    id: row.id,
    title: row.title,
    choices: row.choices,
    closesAt: row.closes_at,
    createdAt: row.created_at,
    discordMessage:
      row.discord_channel_id === null || row.discord_message_id === null
        ? undefined
        : { channelId: row.discord_channel_id, messageId: row.discord_message_id },
  };
}

export function betRepository(sql: SqlClient): BetRepository {
  return {
    async create(bet, createdBy, createdAt) {
      const rows = await sql.query<{ id: string }>(
        "insert into bets (title, closes_at, created_by, created_at) values ($1, $2, $3, $4) returning id",
        [bet.title, bet.closesAt, createdBy, createdAt],
      );
      const { id } = expectRow(rows, "create bet");
      await sql.query(
        `insert into bet_choices (bet_id, position, label)
         select $1, choice.position, choice.label from unnest($2::text[]) with ordinality as choice(label, position)`,
        [id, bet.choices],
      );
      return id;
    },

    async findById(betId) {
      if (!isUuid(betId)) {
        return undefined;
      }
      const [row] = await sql.query<BetRow>(`${SELECT_BETS} where bets.id = $1 group by bets.id`, [betId]);
      return row && toBet(row);
    },

    async listRecent(limit) {
      const rows = await sql.query<BetRow>(`${SELECT_BETS} group by bets.id order by bets.closes_at desc limit $1`, [
        limit,
      ]);
      return rows.map(toBet);
    },

    async setDiscordMessage(betId, message) {
      await sql.query("update bets set discord_channel_id = $2, discord_message_id = $3 where id = $1", [
        betId,
        message.channelId,
        message.messageId,
      ]);
    },
  };
}

interface StakeRow {
  id: string;
  bet_id: string;
  member_id: string;
  member_name: string;
  member_class: string | null;
  choice_id: string;
  amount: number;
  placed_at: Date;
  paid_at: Date | null;
}

/** A member is shown by their main character, else by their Discord name. */
const SELECT_STAKES = `
  select stakes.id, stakes.bet_id, stakes.member_id, stakes.choice_id, stakes.amount, stakes.placed_at, stakes.paid_at,
         coalesce(main.first_name || ' ' || main.last_name, members.discord_name) as member_name,
         main.class as member_class
  from stakes
  join members on members.id = stakes.member_id
  left join characters main on main.member_id = stakes.member_id and main.is_main`;

function toStake(row: StakeRow): Stake {
  return {
    id: row.id,
    betId: row.bet_id,
    memberId: row.member_id,
    memberName: row.member_name,
    memberClass: row.member_class ?? undefined,
    choiceId: row.choice_id,
    amount: row.amount,
    placedAt: row.placed_at,
    paidAt: row.paid_at ?? undefined,
  };
}

export function stakeRepository(sql: SqlClient): StakeRepository {
  async function listByBets(betIds: readonly string[]): Promise<Stake[]> {
    const rows = await sql.query<StakeRow>(
      `${SELECT_STAKES} where stakes.bet_id = any($1::uuid[]) order by stakes.placed_at`,
      [betIds],
    );
    return rows.map(toStake);
  }

  return {
    listByBet: (betId) => listByBets([betId]),
    listByBets,

    async save(stake, placedAt) {
      await sql.query(
        `insert into stakes (bet_id, member_id, choice_id, amount, placed_at) values ($1, $2, $3, $4, $5)
         on conflict (bet_id, member_id) do update
           set choice_id = excluded.choice_id, amount = excluded.amount, placed_at = excluded.placed_at`,
        [stake.betId, stake.memberId, stake.choiceId, stake.amount, placedAt],
      );
    },

    async delete(betId, memberId) {
      await sql.query("delete from stakes where bet_id = $1 and member_id = $2", [betId, memberId]);
    },
  };
}
