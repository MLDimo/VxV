/** What every change made in game carries: its id (unique, made by the author's addon), event and author. */
interface GameChangeBase {
  id: string;
  /** The event it is about; empty for an event created in game and for a stake. */
  eventId: string;
  /** The character who made it, as "Prénom Nom". */
  author: string;
  /** When the author made it, by the clock of their computer: the latest change wins (P9.4). */
  madeAt?: Date;
}

/**
 * A change made in game (P7.5, P9.2, P11.8), as the author's addon recorded it: a sign-up or soft reserves for the
 * author's member, an officer's exclusion of an item, an event an officer creates (date and time as typed on
 * Discord's /vxv_raid), or the member's stake on a bet, placed, moved or taken back.
 */
export type GameChange = GameChangeBase &
  (
    | { kind: "signup"; role: string; spec: string; status: string }
    | { kind: "reserves"; itemIds: number[] }
    | { kind: "exclusion"; itemId: number; excluded: boolean; reason: string }
    | { kind: "event"; date: string; time: string; raidIds: string[]; softReserves: number; reason: string }
    | { kind: "stake"; betId: string; choiceId: string; amount: number }
    | { kind: "withdraw"; betId: string }
  );

/** The changes about a bet rather than an event. */
export function isBetChange(change: GameChange): change is Extract<GameChange, { betId: string }> {
  return change.kind === "stake" || change.kind === "withdraw";
}

/** What became of a change, told to the game with the event's data. */
export interface GameChangeOutcome {
  id: string;
  /** None for an event created in game (its answer goes with every event's data for a while), and for a stake. */
  eventId: string | undefined;
  /** The bet of a stake: its answer goes with the bets' data. */
  betId: string | undefined;
  author: string;
  accepted: boolean;
  /** In French, shown to the author in game. */
  message: string;
}

/** A change made in game before the website's latest one is not applied (P9.4). */
export const OLDER_THAN_WEBSITE =
  "Modifié depuis sur le site ou sur Discord : ce changement fait en jeu, plus ancien, n'est pas appliqué.";
