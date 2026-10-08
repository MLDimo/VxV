import type { RankedDeathroll } from "./deathrolls.ts";
import { count, formatGold, formatSignedGold } from "./labels.ts";
import type { RankedStake } from "./ranking.ts";

/**
 * Ranking (§7.5, owner's decisions of 7 October): each category ranks the members over the period on the same board,
 * the first three on banners, the period's records, then the others. Paris and Deathroll by net gain, Quêtes by
 * points of places (3 for a mission won, 2 for second, 1 for third), Titres by weeks of title held.
 */

export const RANKING_CATEGORIES = ["paris", "deathroll", "quetes", "titres"] as const;
export type RankingCategory = (typeof RANKING_CATEGORIES)[number];

/** How a board's values read: gold with its sign, or a count. */
/** How a board's values read: gold with its sign, points with their sign (the duels' Elo), or a count. */
export type RankingUnit = "gold" | "points" | "count";

export interface BoardRow {
  rank: number;
  memberId: string;
  value: number;
}

/** A record of the period: what, how much as written, and who. */
export interface BoardRecord {
  label: string;
  value: string;
  memberId: string;
}

/** What each category's value is, and how it reads. */
export const RANKING_METRICS: Readonly<Record<RankingCategory, { metric: string; unit: RankingUnit }>> = {
  paris: { metric: "gain net", unit: "gold" },
  deathroll: { metric: "gain net", unit: "gold" },
  quetes: { metric: "points de places", unit: "count" },
  titres: { metric: "semaines de titre", unit: "count" },
};

export interface RankingBoard {
  /** What the value is ("gain net"). */
  metric: string;
  unit: RankingUnit;
  rows: BoardRow[];
  records: BoardRecord[];
}

/** A mission's reward of a place, as given when its result was validated. */
export interface PlacedReward {
  memberId: string;
  rank: number;
  amount: number;
  at: Date;
}

/** A title held by a member for a week ("2026-10-07", its Wednesday). */
export interface HeldTitle {
  week: string;
  titleId: string;
  memberId: string;
}

const PODIUM_PLACES = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

/** Adds the amount to the member's total. */
function add(totals: Map<string, number>, memberId: string, amount: number): void {
  totals.set(memberId, (totals.get(memberId) ?? 0) + amount);
}

/** A member's name, which orders the members of equal value. */
export type NameOf = (memberId: string) => string;

/** The members by value, the highest first, then by name. */
function rank(values: ReadonlyMap<string, number>, nameOf: NameOf): BoardRow[] {
  return [...values]
    .sort(([leftId, left], [rightId, right]) => right - left || nameOf(leftId).localeCompare(nameOf(rightId)))
    .map(([memberId, value], index) => ({ rank: index + 1, memberId, value }));
}

/** The record of a measure: its best member, written; none when nobody has any. */
function record(
  nameOf: NameOf,
  label: string,
  values: ReadonlyMap<string, number>,
  write: (value: number) => string,
): BoardRecord[] {
  const [best] = rank(values, nameOf);
  return best === undefined || best.value <= 0 ? [] : [{ label, value: write(best.value), memberId: best.memberId }];
}

/** The highest of each member's amounts. */
function highest(entries: readonly { memberId: string; amount: number }[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const { memberId, amount } of entries) {
    values.set(memberId, Math.max(values.get(memberId) ?? 0, amount));
  }
  return values;
}

/** How many entries each member has. */
function tally(memberIds: readonly string[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const memberId of memberIds) {
    add(values, memberId, 1);
  }
  return values;
}

const inPeriod = (since: Date | undefined) => (at: Date) => since === undefined || at >= since;

/** The bettors of the bets ended in the period (refunds aside), by net gain. */
export function betsBoard(stakes: readonly RankedStake[], since: Date | undefined, nameOf: NameOf): RankingBoard {
  const played = stakes.filter((stake) => stake.outcome !== "refunded" && inPeriod(since)(stake.endedAt));
  const net = new Map<string, number>();
  for (const stake of played) {
    add(net, stake.memberId, stake.gain - stake.amount);
  }
  const results = played.map((stake) => ({ memberId: stake.memberId, amount: stake.gain - stake.amount }));
  return {
    ...RANKING_METRICS.paris,
    rows: rank(net, nameOf),
    records: [
      ...record(nameOf, "Plus gros gain", highest(results), formatSignedGold),
      ...record(
        nameOf,
        "Plus grosse perte",
        highest(results.map((result) => ({ ...result, amount: -result.amount }))),
        (loss) => formatSignedGold(-loss),
      ),
      ...record(nameOf, "Paris joués", tally(played.map((stake) => stake.memberId)), String),
    ],
  };
}

/** The players of the deathrolls ended in the period, by net gain. */
export function deathrollsBoard(
  games: readonly RankedDeathroll[],
  since: Date | undefined,
  nameOf: NameOf,
): RankingBoard {
  const ended = games.filter((game) => inPeriod(since)(game.endedAt));
  const net = new Map<string, number>();
  for (const game of ended) {
    add(net, game.winnerId, game.stake);
    add(net, game.loserId, -game.stake);
  }
  return {
    ...RANKING_METRICS.deathroll,
    rows: rank(net, nameOf),
    records: [
      ...record(
        nameOf,
        "Plus grosse victoire",
        highest(ended.map((game) => ({ memberId: game.winnerId, amount: game.stake }))),
        formatSignedGold,
      ),
      ...record(
        nameOf,
        "Plus grosse défaite",
        highest(ended.map((game) => ({ memberId: game.loserId, amount: game.stake }))),
        (stake) => formatSignedGold(-stake),
      ),
      ...record(nameOf, "Parties jouées", tally(ended.flatMap((game) => [game.winnerId, game.loserId])), String),
    ],
  };
}

/** The members placed on the missions validated in the period, by points of places. */
export function questsBoard(rewards: readonly PlacedReward[], since: Date | undefined, nameOf: NameOf): RankingBoard {
  const placed = rewards.filter((reward) => reward.rank <= PODIUM_PLACES && inPeriod(since)(reward.at));
  const points = new Map<string, number>();
  for (const reward of placed) {
    add(points, reward.memberId, PODIUM_PLACES + 1 - reward.rank);
  }
  return {
    ...RANKING_METRICS.quetes,
    rows: rank(points, nameOf),
    records: [
      ...record(
        nameOf,
        "Plus de victoires",
        tally(placed.filter((reward) => reward.rank === 1).map((reward) => reward.memberId)),
        String,
      ),
      ...record(nameOf, "Plus grosse récompense", highest(placed), formatGold),
      ...record(nameOf, "Plus de podiums", tally(placed.map((reward) => reward.memberId)), String),
    ],
  };
}

const weekDays = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / DAY_MS;

/** The members' longest run of weeks holding the same title. */
function longestReigns(held: readonly HeldTitle[]): Map<string, number> {
  const reigns = new Map<string, number>();
  const byTitle = new Map<string, HeldTitle[]>();
  for (const title of held) {
    const key = `${title.memberId}|${title.titleId}`;
    byTitle.set(key, [...(byTitle.get(key) ?? []), title]);
  }
  for (const weeks of byTitle.values()) {
    const sorted = weeks.map((title) => title.week).sort();
    let run = 0;
    sorted.forEach((week, index) => {
      const previous = sorted[index - 1];
      run = previous !== undefined && weekDays(previous, week) === WEEK_DAYS ? run + 1 : 1;
      const memberId = weeks[0]?.memberId ?? "";
      reigns.set(memberId, Math.max(reigns.get(memberId) ?? 0, run));
    });
  }
  return reigns;
}

/** The members' titles held in the weeks of the period, by weeks of title. */
export function titlesBoard(held: readonly HeldTitle[], sinceWeek: string | undefined, nameOf: NameOf): RankingBoard {
  const period = held.filter((title) => sinceWeek === undefined || title.week >= sinceWeek);
  const perWeek = tally(period.map((title) => `${title.memberId}|${title.week}`));
  const distinct = new Map<string, Set<string>>();
  for (const title of period) {
    distinct.set(title.memberId, (distinct.get(title.memberId) ?? new Set()).add(title.titleId));
  }
  return {
    ...RANKING_METRICS.titres,
    rows: rank(tally(period.map((title) => title.memberId)), nameOf),
    records: [
      ...record(
        nameOf,
        "Plus de titres en une semaine",
        highest([...perWeek].map(([key, amount]) => ({ memberId: key.split("|")[0] ?? "", amount }))),
        String,
      ),
      ...record(nameOf, "Plus long règne", longestReigns(period), (weeks) => count(weeks, "semaine")),
      ...record(
        nameOf,
        "Titres différents",
        new Map([...distinct].map(([memberId, titles]) => [memberId, titles.size])),
        String,
      ),
    ],
  };
}
