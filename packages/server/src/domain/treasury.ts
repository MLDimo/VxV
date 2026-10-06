import { payout, standing, type Stake } from "./bets.ts";

/**
 * The treasurer's book (P11.6): the stakes to receive, the debts, what is owed to the members, and every validation,
 * visible to all. Gold changes hands in game; the treasurer notes it here.
 */

/** A stake with its bet, as the treasurer's lists show it. */
export interface LedgerStake extends Stake {
  betTitle: string;
  choiceLabel: string;
  /** The treasurers who noted the stake paid, and what it brought back handed over. */
  paidByName: string | undefined;
  collectedByName: string | undefined;
}

/** A validation of the treasurer: a stake (or a debt) received, or a gain handed to its member. */
export interface TreasuryEntry {
  kind: "paid" | "collected";
  at: Date;
  treasurerName: string;
  amount: number;
  stake: LedgerStake;
}

export interface TreasuryBook {
  /** Placed on bets still running, not paid yet. */
  toPay: LedgerStake[];
  /** Lost without being paid. */
  debts: LedgerStake[];
  /** Gains and refunds owed to their members, with the amount to hand over. */
  toCollect: { stake: LedgerStake; amount: number }[];
  /** The latest validations first. */
  history: TreasuryEntry[];
}

/** What the treasurer handed over for a stake: its gain or refund, less a stake that was never paid. */
function handedOver(stake: LedgerStake): number {
  return stake.outcome === undefined || stake.gain === undefined
    ? 0
    : payout(stake, { outcome: stake.outcome, gain: stake.gain });
}

/** The validations recorded on these stakes, the latest first. */
export function treasuryHistory(stakes: readonly LedgerStake[]): TreasuryEntry[] {
  const entries = stakes.flatMap((stake): TreasuryEntry[] => [
    ...(stake.paidAt === undefined
      ? []
      : [
          {
            kind: "paid" as const,
            at: stake.paidAt,
            treasurerName: stake.paidByName ?? "",
            amount: stake.amount,
            stake,
          },
        ]),
    ...(stake.collectedAt === undefined
      ? []
      : [
          {
            kind: "collected" as const,
            at: stake.collectedAt,
            treasurerName: stake.collectedByName ?? "",
            amount: handedOver(stake),
            stake,
          },
        ]),
  ]);
  return entries.sort((left, right) => right.at.getTime() - left.at.getTime());
}

/** The treasurer's lists, from the stakes still waiting for them and those they validated. */
export function treasuryBook(pending: readonly LedgerStake[], validated: readonly LedgerStake[]): TreasuryBook {
  return {
    toPay: pending.filter((stake) => standing(stake) === "toPay"),
    debts: pending.filter((stake) => standing(stake) === "debt"),
    toCollect: pending
      .filter((stake) => standing(stake) === "toCollect")
      .map((stake) => ({ stake, amount: handedOver(stake) })),
    history: treasuryHistory(validated),
  };
}
