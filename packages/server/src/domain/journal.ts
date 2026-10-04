/** Officer actions recorded in the journal. Each new officer action adds its name here. */
export type JournalAction =
  "roster.import" | "event.create" | "exclusion.add" | "exclusion.remove" | "softReserve.override";

export interface NewJournalEntry {
  actorId: string;
  action: JournalAction;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string;
}

export interface JournalEntry extends Omit<NewJournalEntry, "actorId"> {
  id: string;
  occurredAt: Date;
  actorName: string;
}

/** What the journal keeps about a created event. */
export interface EventCreationRecord {
  startsAt: string;
  raids: string[];
  softReservesPerPlayer: number;
}

/** What the journal keeps about an exclusion change. */
export interface ExclusionRecord {
  itemName: string;
  raids: string[];
  eventStartsAt: string;
  /** Characters whose soft reserve on the item was removed by the exclusion. */
  removedSoftReserves: string[];
}

/** What the journal keeps about an officer's correction of a player's soft reserves. */
export interface SoftReserveOverrideRecord {
  characterName: string;
  raids: string[];
  eventStartsAt: string;
  before: string[];
  after: string[];
}
