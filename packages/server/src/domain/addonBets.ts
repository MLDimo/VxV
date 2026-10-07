import { addonHead, flag, line, seconds, text, type AddonReaders } from "./addonText.ts";
import { standing, type Bet, type Stake } from "./bets.ts";
import type { CashMovement, CashSummary } from "./cash.ts";
import type { GameChangeOutcome } from "./gameChanges.ts";

/** First line of the bets' data for the addon (contract with VXV_Paris); the number is the format version. */
export const ADDON_BETS_HEADER = "VXV-PARIS-1";

/** How many of the latest cash movements the addon shows. */
export const ADDON_CASH_MOVEMENTS = 10;

export interface AddonBetsFacts extends AddonReaders {
  bets: readonly { bet: Bet; stakes: readonly Stake[] }[];
  cash: CashSummary & { movements: readonly CashMovement[] };
  /** What became of the stakes made in game, in the order received. */
  changes: readonly GameChangeOutcome[];
}

/**
 * The bets as the companion hands them to the addon, one record per line, after the head of every bundle's data
 * (addonHead: P, O and M):
 * B;bet id;closing (Unix seconds);end (Unix seconds, 0 while it runs);winning choice id, empty without;title
 * H;bet id;choice id;label (the bet's choices, in order)
 * S;bet id;member id;member;class token, empty without main;choice id;amount;standing;gain, 0 while it runs
 * T;balance;entries of the month;exits of the month (the guild's cash)
 * K;time (Unix seconds);amount, negative for an exit;label (the latest movements first)
 * C;change id;1 when done, 0 when refused;message
 * The addon parses the lines in this order.
 */
export function formatAddonBets(facts: AddonBetsFacts): string {
  return [
    ...addonHead(ADDON_BETS_HEADER, facts),
    ...facts.bets.flatMap(({ bet, stakes }) => [
      line(
        "B",
        bet.id,
        seconds(bet.closesAt),
        bet.endedAt === undefined ? 0 : seconds(bet.endedAt),
        bet.winningChoiceId ?? "",
        text(bet.title),
      ),
      ...bet.choices.map((choice) => line("H", bet.id, choice.id, text(choice.label))),
      ...stakes.map((stake) =>
        line(
          "S",
          bet.id,
          stake.memberId,
          text(stake.memberName),
          stake.memberClass ?? "",
          stake.choiceId,
          stake.amount,
          standing(stake),
          stake.gain ?? 0,
        ),
      ),
    ]),
    line("T", facts.cash.balance, facts.cash.entries, facts.cash.exits),
    ...facts.cash.movements
      .slice(0, ADDON_CASH_MOVEMENTS)
      .map((movement) => line("K", seconds(movement.occurredAt), movement.amount, text(movement.label))),
    ...facts.changes.map((change) => line("C", change.id, flag(change.accepted), text(change.message))),
  ].join("\n");
}
