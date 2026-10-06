import { isDebt, type Stake } from "./bets.ts";

/**
 * The bettors' ranking (P11.7): net gain (gains less stakes), total won, bets played and success rate, over the
 * bets ended in the period: since always, this month, or this season (started by an officer).
 */

export const RANKING_PERIODS = ["always", "month", "season"] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

/** A stake of an ended bet, with when its bet ended. */
export interface RankedStake extends Pick<Stake, "memberId" | "memberName" | "memberClass" | "amount" | "paidAt"> {
  outcome: "won" | "lost" | "refunded";
  gain: number;
  endedAt: Date;
  /** The main character's appearance, for the avatar. */
  memberRace: string | undefined;
  memberSex: "male" | "female" | undefined;
}

export interface BettorRank {
  rank: number;
  memberId: string;
  memberName: string;
  memberClass: string | undefined;
  memberRace: string | undefined;
  memberSex: "male" | "female" | undefined;
  /** Gains less stakes. */
  net: number;
  /** What the won bets brought back. */
  won: number;
  bets: number;
  /** From 0 to 1. */
  successRate: number;
  /** What the member owes, whatever the period. */
  debt: number;
}

/** The bettors of the bets ended since the instant (all of them without one), the best net gain first. */
export function bettorsRanking(stakes: readonly RankedStake[], since: Date | undefined): BettorRank[] {
  const byMember = new Map<string, RankedStake[]>();
  for (const stake of stakes) {
    byMember.set(stake.memberId, [...(byMember.get(stake.memberId) ?? []), stake]);
  }
  const rows = [...byMember.values()].flatMap((all) => {
    const played = all.filter(
      (stake) => stake.outcome !== "refunded" && (since === undefined || stake.endedAt >= since),
    );
    const [first] = all;
    if (first === undefined || played.length === 0) {
      return [];
    }
    const won = played.filter((stake) => stake.outcome === "won");
    const total = (amounts: number[]) => amounts.reduce((sum, amount) => sum + amount, 0);
    return [
      {
        memberId: first.memberId,
        memberName: first.memberName,
        memberClass: first.memberClass,
        memberRace: first.memberRace,
        memberSex: first.memberSex,
        net: total(played.map((stake) => stake.gain - stake.amount)),
        won: total(won.map((stake) => stake.gain)),
        bets: played.length,
        successRate: won.length / played.length,
        debt: total(all.filter((stake) => isDebt(stake, stake.outcome)).map((stake) => stake.amount)),
      },
    ];
  });
  rows.sort(
    (left, right) => right.net - left.net || right.won - left.won || left.memberName.localeCompare(right.memberName),
  );
  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}
