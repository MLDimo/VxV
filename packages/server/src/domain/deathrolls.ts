import { instant, readRecords, requireRecord, wholeNumber } from "./textFormat.ts";

/**
 * Deathrolls (P15): one against one, the challenged rolling first from the starting number, each next roll from 0 to
 * the previous result; who rolls 0 loses the stake to the other. The guild bets on the game during the minute before
 * the first roll.
 */

/** Every roll starts there, and who rolls it loses (owner's rule of 8 October). */
export const DEATHROLL_LOSING_ROLL = 0;

/** First line of a game sent by the addon (contract with VXV/Deathroll); the number is the format version. */
export const DEATHROLL_HEADER = "VXV-DEATHROLL-1";

/** The stake from which a game is announced on Discord (P15.5). */
export const BIG_STAKE = 1000;

/** How long the guild bets on a game, between its acceptance and its first roll (P15.2). */
export const DEATHROLL_BETTING_MS = 60_000;

export interface DeathrollRoll {
  /** "Prénom Nom". */
  character: string;
  high: number;
  result: number;
}

/** A game as the addon tells it, once over. */
export interface DeathrollGame {
  id: string;
  challenger: string;
  challenged: string;
  stake: number;
  start: number;
  acceptedAt: Date;
  endedAt: Date;
  rolls: DeathrollRoll[];
  /** The stakes of the guild on a player, placed before the first roll. */
  bets: { bettor: string; choice: string; amount: number }[];
  /** The winner's confirmation of the payment, if given. */
  paid: { by: string; at: Date } | undefined;
}

/**
 * Reads a game, one record per line:
 * G;id;challenger;challenged;stake;starting number;accepted (Unix seconds);ended (Unix seconds)
 * R;character;high;result (the rolls, in order)
 * B;bettor;player chosen;amount (the guild's stakes)
 * Y;character confirming;when (Unix seconds) (the winner confirmed the payment)
 * Lines of an unknown kind are skipped.
 */
export function parseDeathroll(text: string): DeathrollGame {
  let game: Omit<DeathrollGame, "rolls" | "bets" | "paid"> | undefined;
  const rolls: DeathrollRoll[] = [];
  const bets: DeathrollGame["bets"] = [];
  let paid: DeathrollGame["paid"];
  readRecords(text, {
    header: DEATHROLL_HEADER,
    wrongHeader: `Une partie doit commencer par la ligne ${DEATHROLL_HEADER}.`,
    readers: {
      G: ([id, challenger, challenged, stake, start, acceptedAt, endedAt]) => {
        const values = {
          stake: wholeNumber(stake),
          start: wholeNumber(start),
          acceptedAt: instant(acceptedAt),
          endedAt: instant(endedAt),
        };
        if (
          !id ||
          !challenger ||
          !challenged ||
          values.stake === undefined ||
          values.start === undefined ||
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
          start: values.start,
          acceptedAt: values.acceptedAt,
          endedAt: values.endedAt,
        };
        return true;
      },
      R: ([character, high, result]) => {
        const values = { high: wholeNumber(high), result: wholeNumber(result) };
        if (!character || values.high === undefined || values.result === undefined) {
          return false;
        }
        rolls.push({ character, high: values.high, result: values.result });
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
  return { ...requireRecord(game, "La partie ne dit pas qui a joué (ligne G manquante)."), rolls, bets, paid };
}

/** Who lost: the player who rolled the losing roll, the last roll. */
export function deathrollLoser(game: Pick<DeathrollGame, "rolls">): string | undefined {
  return game.rolls.at(-1)?.character;
}

/** The other player. */
export function opponentOf(game: Pick<DeathrollGame, "challenger" | "challenged">, player: string): string {
  return player === game.challenger ? game.challenged : game.challenger;
}

/**
 * Why a game breaks the rules, or undefined: two players, a stake, a starting number above 1, the challenged rolling
 * first and each in turn, each roll from 0 to the previous result, the game over at the first 0.
 */
export function deathrollRefusal(game: DeathrollGame): string | undefined {
  if (game.challenger === game.challenged) {
    return "Un deathroll se joue à deux.";
  }
  if (game.stake < 1 || game.start < 2) {
    return "Mise d'au moins 1 po et nombre de départ d'au moins 2.";
  }
  let high = game.start;
  for (const [index, roll] of game.rolls.entries()) {
    const expected = index % 2 === 0 ? game.challenged : game.challenger;
    if (
      roll.character !== expected ||
      roll.high !== high ||
      roll.result < DEATHROLL_LOSING_ROLL ||
      roll.result > high
    ) {
      return `Roll ${String(index + 1)} hors des règles.`;
    }
    if (roll.result === DEATHROLL_LOSING_ROLL && index < game.rolls.length - 1) {
      return `La partie continue après un ${String(DEATHROLL_LOSING_ROLL)}.`;
    }
    high = roll.result;
  }
  return game.rolls.at(-1)?.result === DEATHROLL_LOSING_ROLL ? undefined : "La partie n'est pas finie.";
}

/** The guild's stakes that count (P15.2): on a player, by someone else, of 1 po at least. */
export function deathrollBets(game: DeathrollGame): DeathrollGame["bets"] {
  const players = [game.challenger, game.challenged];
  return game.bets.filter((bet) => !players.includes(bet.bettor) && players.includes(bet.choice) && bet.amount >= 1);
}

/** A game over, for the ranking: the members who won and lost it, its stake and when it ended. */
export interface RankedDeathroll {
  winnerId: string;
  loserId: string;
  stake: number;
  endedAt: Date;
}
