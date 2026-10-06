import { flag, line, seconds, text } from "./addonText.ts";
import { standing, type Bet, type Stake } from "./bets.ts";
import type { CashMovement, CashSummary } from "./cash.ts";
import { fullName, type Character } from "./characters.ts";
import type { GameChangeOutcome } from "./gameChanges.ts";
import type { BettorRank } from "./ranking.ts";

/** First line of the bets' data for the addon (contract with VXV_Paris); the number is the format version. */
export const ADDON_BETS_HEADER = "VXV-PARIS-1";

/** How many of the latest cash movements and of the first bettors the addon shows. */
export const ADDON_CASH_MOVEMENTS = 10;
export const ADDON_RANKED_BETTORS = 10;

export interface AddonBetsFacts {
  bets: readonly { bet: Bet; stakes: readonly Stake[] }[];
  /** Characters of the officers and the guild master: the addon takes the bets' data from them only. */
  officers: readonly Character[];
  /** The guild's characters linked to a member: the addon finds the player's member by the character played. */
  characters: readonly Character[];
  cash: CashSummary & { movements: readonly CashMovement[] };
  ranking: readonly BettorRank[];
  /** What became of the stakes made in game, in the order received. */
  changes: readonly GameChangeOutcome[];
  exportedAt: Date;
}

/**
 * The bets as the companion hands them to the addon, one record per line:
 * P;export (Unix seconds)
 * O;officer character
 * M;member id;character of the member
 * B;bet id;closing (Unix seconds);end (Unix seconds, 0 while it runs);winning choice id, empty without;title
 * H;bet id;choice id;label (the bet's choices, in order)
 * S;bet id;member id;member;class token, empty without main;choice id;amount;standing;gain, 0 while it runs
 * T;balance;entries of the month;exits of the month (the guild's cash)
 * K;time (Unix seconds);amount, negative for an exit;label (the latest movements first)
 * R;rank;member;class token, empty without main;net gain;bets played (the bettors since always)
 * C;change id;1 when done, 0 when refused;message
 * The addon parses the lines in this order.
 */
export function formatAddonBets(facts: AddonBetsFacts): string {
  return [
    ADDON_BETS_HEADER,
    line("P", seconds(facts.exportedAt)),
    ...facts.officers.map((officer) => line("O", fullName(officer))),
    ...facts.characters.flatMap((character) =>
      character.memberId === undefined ? [] : [line("M", character.memberId, fullName(character))],
    ),
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
    ...facts.ranking
      .slice(0, ADDON_RANKED_BETTORS)
      .map((rank) => line("R", rank.rank, text(rank.memberName), rank.memberClass ?? "", rank.net, rank.bets)),
    ...facts.changes.map((change) => line("C", change.id, flag(change.accepted), text(change.message))),
  ].join("\n");
}
