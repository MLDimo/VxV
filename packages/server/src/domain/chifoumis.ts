import type { GameBet } from "./diceGames.ts";
import { instant, readRecords, requireRecord, wholeNumber } from "./textFormat.ts";

/**
 * The Chi Fou Mi (owner's request of 14 October): rock, paper, scissors, one against one in game, at the best of
 * three rounds; a draw does not count and is played again. The players choose the stake, 0 included; the guild bets
 * on the game during the minute before the first round (Le Dé Pipé's rules, diceGames.ts).
 */

/** First line of a game sent by the addon (contract with VXV/Chifoumi); the number is the format version. */
export const CHIFOUMI_HEADER = "VXV-CHIFOUMI-1";

/** The rounds a player wins the game with. */
export const CHIFOUMI_ROUNDS_TO_WIN = 2;

export const CHIFOUMI_MOVES = ["pierre", "feuille", "ciseaux"] as const;

export type ChifoumiMove = (typeof CHIFOUMI_MOVES)[number];

/** What each move beats: the rock blunts the scissors, the paper wraps the rock, the scissors cut the paper. */
const BEATS: Record<ChifoumiMove, ChifoumiMove> = { pierre: "ciseaux", feuille: "pierre", ciseaux: "feuille" };

/** A round: each player's move. */
export interface ChifoumiRound {
  challenger: ChifoumiMove;
  challenged: ChifoumiMove;
}

/** A game as the addon tells it, once over. */
export interface ChifoumiGame {
  id: string;
  challenger: string;
  challenged: string;
  stake: number;
  acceptedAt: Date;
  endedAt: Date;
  /** Every round played, draws included, in order. */
  rounds: ChifoumiRound[];
  /** The stakes of the guild on a player, placed before the first round. */
  bets: GameBet[];
  /** The winner's confirmation of the payment, if given. */
  paid: { by: string; at: Date } | undefined;
}

function isMove(value: string | undefined): value is ChifoumiMove {
  return (CHIFOUMI_MOVES as readonly (string | undefined)[]).includes(value);
}

/**
 * Reads a game, one record per line:
 * G;id;challenger;challenged;stake;accepted (Unix seconds);ended (Unix seconds)
 * M;challenger's move;challenged's move (the rounds, in order: pierre, feuille or ciseaux)
 * B;bettor;player chosen;amount (the guild's stakes)
 * Y;character confirming;when (Unix seconds) (the winner confirmed the payment)
 * Lines of an unknown kind are skipped.
 */
export function parseChifoumi(text: string): ChifoumiGame {
  let game: Omit<ChifoumiGame, "rounds" | "bets" | "paid"> | undefined;
  const rounds: ChifoumiRound[] = [];
  const bets: GameBet[] = [];
  let paid: ChifoumiGame["paid"];
  readRecords(text, {
    header: CHIFOUMI_HEADER,
    wrongHeader: `Une partie doit commencer par la ligne ${CHIFOUMI_HEADER}.`,
    readers: {
      G: ([id, challenger, challenged, stake, acceptedAt, endedAt]) => {
        const values = { stake: wholeNumber(stake), acceptedAt: instant(acceptedAt), endedAt: instant(endedAt) };
        if (
          !id ||
          !challenger ||
          !challenged ||
          values.stake === undefined ||
          values.acceptedAt === undefined ||
          values.endedAt === undefined
        ) {
          return false;
        }
        game = {
          id,
          challenger,
          challenged,
          stake: values.stake,
          acceptedAt: values.acceptedAt,
          endedAt: values.endedAt,
        };
        return true;
      },
      M: ([challenger, challenged]) => {
        if (!isMove(challenger) || !isMove(challenged)) {
          return false;
        }
        rounds.push({ challenger, challenged });
        return true;
      },
      B: ([bettor, choice, amount]) => {
        const value = wholeNumber(amount);
        if (!bettor || !choice || value === undefined) {
          return false;
        }
        bets.push({ bettor, choice, amount: value });
        return true;
      },
      Y: ([by, at]) => {
        const when = instant(at);
        if (!by || when === undefined) {
          return false;
        }
        paid = { by, at: when };
        return true;
      },
    },
  });
  return { ...requireRecord(game, "La partie ne dit pas qui a joué (ligne G manquante)."), rounds, bets, paid };
}

/** Who won the round: "challenger", "challenged", or undefined for a draw. */
export function roundWinner(round: ChifoumiRound): "challenger" | "challenged" | undefined {
  if (round.challenger === round.challenged) {
    return undefined;
  }
  return BEATS[round.challenger] === round.challenged ? "challenger" : "challenged";
}

/** The rounds each player won so far. */
export function chifoumiScore(rounds: readonly ChifoumiRound[]): { challenger: number; challenged: number } {
  const score = { challenger: 0, challenged: 0 };
  for (const round of rounds) {
    const winner = roundWinner(round);
    if (winner !== undefined) {
      score[winner] += 1;
    }
  }
  return score;
}

/** Who lost the game, once a player won two rounds; undefined before. */
export function chifoumiLoser(game: Pick<ChifoumiGame, "challenger" | "challenged" | "rounds">): string | undefined {
  const score = chifoumiScore(game.rounds);
  if (score.challenger >= CHIFOUMI_ROUNDS_TO_WIN) {
    return game.challenged;
  }
  return score.challenged >= CHIFOUMI_ROUNDS_TO_WIN ? game.challenger : undefined;
}

/** Why a game breaks the rules, or undefined: two players, a stake of 0 po at least, no round once it is won. */
export function chifoumiRefusal(game: ChifoumiGame): string | undefined {
  if (game.challenger === game.challenged) {
    return "Un Chi Fou Mi se joue à deux.";
  }
  for (const index of game.rounds.keys()) {
    if (index > 0 && chifoumiLoser({ ...game, rounds: game.rounds.slice(0, index) }) !== undefined) {
      return `La partie continue après sa ${String(CHIFOUMI_ROUNDS_TO_WIN)}e manche gagnée.`;
    }
  }
  return chifoumiLoser(game) === undefined ? "La partie n'est pas finie." : undefined;
}
