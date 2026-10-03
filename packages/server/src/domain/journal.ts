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
