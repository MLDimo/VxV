import type { BetRepository, StakeRepository } from "../../application/ports.ts";
import type { Bet, BetChoice, Stake, StakeOutcome } from "../../domain/bets.ts";
import type { LedgerStake } from "../../domain/treasury.ts";
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
  ended_at: Date | null;
  winning_choice_id: string | null;
  choices: BetChoice[];
}

const SELECT_BETS = `
  select bets.id, bets.title, bets.closes_at, bets.created_at, bets.discord_channel_id, bets.discord_message_id,
         bets.ended_at, bets.winning_choice_id,
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
    endedAt: row.ended_at ?? undefined,
    winningChoiceId: row.winning_choice_id ?? undefined,
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

    async end(betId, winningChoiceId, endedAt) {
      await sql.query(
        `update bets set winning_choice_id = $2::uuid, ended_at = $3::timestamptz,
                cancelled_at = case when $2::uuid is null then $3::timestamptz end
         where id = $1`,
        [betId, winningChoiceId ?? null, endedAt],
      );
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
  outcome: StakeOutcome | null;
  gain: number | null;
  collected_at: Date | null;
}

const STAKE_COLUMNS = `
  stakes.id, stakes.bet_id, stakes.member_id, stakes.choice_id, stakes.amount, stakes.placed_at, stakes.paid_at,
  stakes.outcome, stakes.gain, stakes.collected_at,
  coalesce(main.first_name || ' ' || main.last_name, members.discord_name) as member_name, main.class as member_class`;

/** A member is shown by their main character, else by their Discord name. */
const STAKE_JOINS = `
  join members on members.id = stakes.member_id
  left join characters main on main.member_id = stakes.member_id and main.is_main`;

const SELECT_STAKES = `select ${STAKE_COLUMNS} from stakes ${STAKE_JOINS}`;

/** Stakes with their bet and the treasurers who validated them, for the treasurer's book. */
const SELECT_LEDGER = `
  select ${STAKE_COLUMNS}, bets.title as bet_title, bet_choices.label as choice_label,
         payer.discord_name as paid_by_name, hander.discord_name as collected_by_name
  from stakes ${STAKE_JOINS}
  join bets on bets.id = stakes.bet_id
  join bet_choices on bet_choices.id = stakes.choice_id
  left join members payer on payer.id = stakes.paid_by
  left join members hander on hander.id = stakes.collected_by`;

interface LedgerRow extends StakeRow {
  bet_title: string;
  choice_label: string;
  paid_by_name: string | null;
  collected_by_name: string | null;
}

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
    outcome: row.outcome ?? undefined,
    gain: row.gain ?? undefined,
    collectedAt: row.collected_at ?? undefined,
  };
}

function toLedgerStake(row: LedgerRow): LedgerStake {
  return {
    ...toStake(row),
    betTitle: row.bet_title,
    choiceLabel: row.choice_label,
    paidByName: row.paid_by_name ?? undefined,
    collectedByName: row.collected_by_name ?? undefined,
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

    async findById(stakeId) {
      if (!isUuid(stakeId)) {
        return undefined;
      }
      const [row] = await sql.query<StakeRow>(`${SELECT_STAKES} where stakes.id = $1`, [stakeId]);
      return row && toStake(row);
    },

    async listByMember(memberId) {
      const rows = await sql.query<StakeRow>(`${SELECT_STAKES} where stakes.member_id = $1 order by stakes.placed_at`, [
        memberId,
      ]);
      return rows.map(toStake);
    },

    async settle(settled) {
      await sql.query(
        `update stakes set outcome = settled.outcome::stake_outcome, gain = settled.gain
         from unnest($1::uuid[], $2::text[], $3::integer[]) as settled(id, outcome, gain)
         where stakes.id = settled.id`,
        [
          settled.map((stake) => stake.stakeId),
          settled.map((stake) => stake.outcome),
          settled.map((stake) => stake.gain),
        ],
      );
    },

    async markPaid(stakeId, treasurerId, at) {
      await sql.query("update stakes set paid_at = $3, paid_by = $2 where id = $1", [stakeId, treasurerId, at]);
    },

    async markCollected(stakeId, treasurerId, at) {
      await sql.query("update stakes set collected_at = $3, collected_by = $2 where id = $1", [
        stakeId,
        treasurerId,
        at,
      ]);
    },

    async listPending() {
      const rows = await sql.query<LedgerRow>(
        `${SELECT_LEDGER}
         where (stakes.paid_at is null and (stakes.outcome is null or stakes.outcome = 'lost'))
            or (stakes.outcome in ('won', 'refunded') and stakes.collected_at is null)
         order by bets.closes_at, stakes.placed_at`,
      );
      return rows.map(toLedgerStake);
    },

    async listValidated(limit) {
      const rows = await sql.query<LedgerRow>(
        `${SELECT_LEDGER}
         where stakes.paid_at is not null or stakes.collected_at is not null
         order by greatest(stakes.paid_at, stakes.collected_at) desc limit $1`,
        [limit],
      );
      return rows.map(toLedgerStake);
    },
  };
}
