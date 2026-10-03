export interface RaidSummary {
  id: string;
  name: string;
}

export interface RaidEvent {
  id: string;
  startsAt: Date;
  softReservesPerPlayer: number;
  /** One or several raids played the same evening, by name. */
  raids: RaidSummary[];
  /** Sign-up message published by the bot on Discord, once it exists. */
  discordMessageId: string | undefined;
}

export interface NewRaidEvent {
  startsAt: Date;
  raidIds: string[];
  softReservesPerPlayer: number;
}

export const DEFAULT_SOFT_RESERVES = 1;
export const MAX_SOFT_RESERVES = 10;

/** Upcoming events stay listed a few hours after their start, while the raid is being played. */
export const EVENT_LISTED_AFTER_START_MS = 6 * 60 * 60 * 1000;

/** Why an officer may not create this event, or undefined when it is valid. */
export function newEventRefusal(event: NewRaidEvent, now: Date, knownRaidIds: ReadonlySet<string>): string | undefined {
  if (Number.isNaN(event.startsAt.getTime())) {
    return "La date et l'heure du raid sont invalides.";
  }
  if (event.startsAt.getTime() <= now.getTime()) {
    return "Le raid doit commencer dans le futur.";
  }
  if (event.raidIds.length === 0) {
    return "Choisissez au moins un raid.";
  }
  if (event.raidIds.some((raidId) => !knownRaidIds.has(raidId))) {
    return "Un des raids choisis n'existe pas.";
  }
  const count = event.softReservesPerPlayer;
  if (!Number.isInteger(count) || count < DEFAULT_SOFT_RESERVES || count > MAX_SOFT_RESERVES) {
    return `Le nombre de SR par joueur doit être compris entre ${DEFAULT_SOFT_RESERVES} et ${MAX_SOFT_RESERVES}.`;
  }
  return undefined;
}
