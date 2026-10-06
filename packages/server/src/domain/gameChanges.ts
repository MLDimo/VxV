/** What every change made in game carries: its id (unique, made by the author's addon), event and author. */
interface GameChangeBase {
  id: string;
  /** The event it is about; none for an event created in game. */
  eventId: string;
  /** The character who made it, as "Prénom Nom". */
  author: string;
  /** When the author made it, by the clock of their computer: the latest change wins (P9.4). */
  madeAt?: Date;
}

/**
 * A change made in game (P7.5, P9.2), as the author's addon recorded it: a sign-up or soft reserves for the
 * author's member, an officer's exclusion of an item, or an event an officer creates (date and time as typed on
 * Discord's /vxv_raid).
 */
export type GameChange = GameChangeBase &
  (
    | { kind: "signup"; role: string; spec: string; status: string }
    | { kind: "reserves"; itemIds: number[] }
    | { kind: "exclusion"; itemId: number; excluded: boolean; reason: string }
    | { kind: "event"; date: string; time: string; raidIds: string[]; softReserves: number; reason: string }
  );

/** What became of a change, told to the game with the event's data. */
export interface GameChangeOutcome {
  id: string;
  /** None for an event created in game: its answer goes with every event's data for a while. */
  eventId: string | undefined;
  author: string;
  accepted: boolean;
  /** In French, shown to the author in game. */
  message: string;
}

/** A change made in game before the website's latest one is not applied (P9.4). */
export const OLDER_THAN_WEBSITE =
  "Modifié depuis sur le site ou sur Discord : ce changement fait en jeu, plus ancien, n'est pas appliqué.";
