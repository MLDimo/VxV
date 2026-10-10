/** The answers to what is created in game go with the data of its kind this long: their author learns them. */
export const CREATION_ANSWERS_MS = 14 * 24 * 60 * 60 * 1000;

/** What every change made in game carries: its id (unique, made by the author's addon), event and author. */
interface GameChangeBase {
  id: string;
  /** The event it is about; empty for what is created in game, and for a stake or a duel. */
  eventId: string;
  /** The character who made it, as "Prénom Nom". */
  author: string;
  /** When the author made it, by the clock of their computer: the latest change wins (P9.4). */
  madeAt?: Date;
}

/**
 * A change made in game (P7.5, P9.2, P11.8), as the author's addon recorded it: a sign-up or soft reserves for the
 * author's member, an officer's exclusion of an item, a raid night or a PvP outing an officer creates (date and time
 * as typed on Discord's /vxv_raid, the Discord role chosen among the website's), the member's stake on a bet,
 * placed, moved or taken back, a bet an officer opens (closing date and time as typed on Discord's /vxv_pari, owner's
 * decision of 7 October), and the duels (VXV/PvP): a challenge, its answer, its cancellation, the loser's concession
 * and the result the game showed ("Prénom Nom" of the winner and the loser), and a quest an officer publishes
 * (VXV/Missions, as Discord's /vxv_mission: its type, title or the type's, reward, days from when it was published).
 */
export type GameChange = GameChangeBase &
  (
    | { kind: "signup"; role: string; spec: string; status: string }
    | { kind: "reserves"; itemIds: number[] }
    | { kind: "exclusion"; itemId: number; excluded: boolean; reason: string }
    | {
        kind: "event";
        date: string;
        time: string;
        raidIds: string[];
        softReserves: number;
        roleId: string;
        reason: string;
      }
    | { kind: "stake"; betId: string; choiceId: string; amount: number }
    | { kind: "withdraw"; betId: string }
    | { kind: "bet"; title: string; choices: string[]; date: string; time: string; reason: string }
    | { kind: "pvpEvent"; title: string; date: string; time: string; roleId: string; reason: string }
    | { kind: "duel"; opponentId: string; date: string; time: string; place: string }
    | { kind: "duelAnswer"; duelId: string; accept: boolean }
    | { kind: "duelConcede"; duelId: string }
    | { kind: "duelCancel"; duelId: string }
    | { kind: "duelResult"; duelId: string; winner: string; loser: string }
    | { kind: "mission"; type: string; title: string; reward: number; days: number; reason: string }
  );

/** What a change creates rather than modifies: its answer is kept with what it created. */
export function isCreation(change: GameChange): boolean {
  return ["event", "bet", "pvpEvent", "duel", "mission"].includes(change.kind);
}

/** The changes about a duel. */
export function isDuelChange(change: GameChange): change is Extract<GameChange, { duelId: string }> {
  return "duelId" in change;
}

/** The changes about a bet rather than an event. */
export function isBetChange(change: GameChange): change is Extract<GameChange, { betId: string }> {
  return change.kind === "stake" || change.kind === "withdraw";
}

/** What became of a change, told to the game with the event's data. */
export interface GameChangeOutcome {
  id: string;
  /** None for an event created in game (its answer goes with every event's data for a while), and for a stake. */
  eventId: string | undefined;
  /** The bet of a stake, or the bet opened: its answer goes with the bets' data. */
  betId: string | undefined;
  /** The duel of a change about it, or the challenge made: its answer goes with the PvP data. */
  duelId: string | undefined;
  /** The quest published in game: its answer goes with the quests' data. */
  missionId: string | undefined;
  author: string;
  accepted: boolean;
  /** In French, shown to the author in game. */
  message: string;
}

/** A change made in game before the website's latest one is not applied (P9.4). */
export const OLDER_THAN_WEBSITE =
  "Modifié depuis sur le site ou sur Discord : ce changement fait en jeu, plus ancien, n'est pas appliqué.";
