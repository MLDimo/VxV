import type { LootMethod } from "./history.ts";

/** Officer actions recorded in the journal. Each new officer action adds its name here. */
export type JournalAction =
  | "roster.import"
  | "event.create"
  | "exclusion.add"
  | "exclusion.remove"
  | "softReserve.override"
  | "raid.import"
  | "loot.council"
  | "loot.correct"
  | "bet.create"
  | "bet.result"
  | "bet.cancel"
  | "season.start"
  | "mission.create"
  | "mission.close"
  | "title.give";

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
  /** Who may sign up (eventAudience); none for the events created before roles. */
  audience?: string;
}

/** What the journal keeps about an exclusion change. */
export interface ExclusionRecord {
  itemName: string;
  raids: string[];
  eventStartsAt: string;
  /** Characters whose soft reserve on the item was removed by the exclusion. */
  removedSoftReserves: string[];
}

/** What the journal keeps about the import of a raid's log from the addon. */
export interface RaidLogImportRecord {
  raids: string[];
  eventStartsAt: string;
  kills: number;
  present: number;
  /** Gives added by this import: the others were known already. */
  loots: number;
  unknownCharacters: string[];
  unknownLoots: number;
}

/** What the journal keeps about an item the organisation gave (loot council). */
export interface LootCouncilRecord {
  itemName: string;
  characterName: string;
  raids: string[];
  eventStartsAt: string;
}

/** What the journal keeps about an officer's correction of a loot: winner and method, before and after. */
export interface LootCorrectionRecord {
  itemName: string;
  raids: string[];
  eventStartsAt: string;
  before: { winnerName: string; method: LootMethod };
  after: { winnerName: string; method: LootMethod };
}

/** What the journal keeps about a bet an officer opened. */
export interface BetCreationRecord {
  title: string;
  choices: string[];
  closesAt: string;
}

/** What the journal keeps about the end of a bet: its winning choice (none when cancelled) and its gold. */
export interface BetEndRecord {
  title: string;
  winner: string | undefined;
  pool: number;
  winners: number;
  /** What went to the guild's cash. */
  organisation: number;
}

/** What the journal keeps about a mission an officer published. */
export interface MissionCreationRecord {
  title: string;
  type: string;
  reward: number;
  startsAt: string;
  endsAt: string;
}

/** What the journal keeps about a mission's validated result: its winners and their rewards. */
export interface MissionCloseRecord {
  title: string;
  reward: number;
  winners: { rank: number; name: string; amount: number }[];
}

/** What the journal keeps about a title an officer gave for the week (the former holder is its "before"). */
export interface TitleGiveRecord {
  title: string;
  /** The week's Wednesday, "2026-10-07". */
  week: string;
  holder: string;
}

/** What the journal keeps about a new season of the rankings. */
export interface SeasonStartRecord {
  number: number;
}

/** What the journal keeps about an officer's correction of a player's soft reserves. */
export interface SoftReserveOverrideRecord {
  characterName: string;
  raids: string[];
  eventStartsAt: string;
  before: string[];
  after: string[];
}
