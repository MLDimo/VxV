/** What every change made in game carries: its id (unique, made by the author's addon), event and author. */
interface GameChangeBase {
  id: string;
  eventId: string;
  /** The character who made it, as "Prénom Nom". */
  author: string;
}

/**
 * A change made in game (P7.5), as the author's addon recorded it: a sign-up or soft reserves for the author's
 * member, or an officer's exclusion of an item.
 */
export type GameChange = GameChangeBase &
  (
    | { kind: "signup"; role: string; spec: string; status: string }
    | { kind: "reserves"; itemIds: number[] }
    | { kind: "exclusion"; itemId: number; excluded: boolean; reason: string }
  );

/** What became of a change, told to the game with the event's data. */
export interface GameChangeOutcome {
  id: string;
  eventId: string;
  author: string;
  accepted: boolean;
  /** In French, shown to the author in game. */
  message: string;
}

/** What the game tells the author once the change is done. */
export function acceptedMessage(change: GameChange): string {
  switch (change.kind) {
    case "signup":
      return "Inscription enregistrée sur le site.";
    case "reserves":
      return "SR enregistrées sur le site.";
    case "exclusion":
      return change.excluded ? "Objet exclu des SR." : "Objet de nouveau ouvert aux SR.";
  }
}
