import type { Stake } from "./bets.ts";

/** The rankings' periods (P11.7, §7.5): since always, this month, or this season (started by an officer). */

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
