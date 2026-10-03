import type { Character } from "../domain/characters.ts";
import type { NewRaidEvent, RaidEvent, RaidSummary } from "../domain/events.ts";
import type { LootMethod, LootRecord } from "../domain/history.ts";
import type { JournalEntry, NewJournalEntry } from "../domain/journal.ts";
import type { Member, MemberRole } from "../domain/members.ts";
import type { RaidReminder, ReminderTarget } from "../domain/reminders.ts";
import type { RosterEntry } from "../domain/roster.ts";
import type { Signup, SignupChoice } from "../domain/signups.ts";
import type { LootItem, PastEventForItem, SoftReserve } from "../domain/softReserves.ts";

export interface DiscordIdentity {
  discordId: string;
  discordName: string;
}

export interface Session {
  /** SHA-256 hash of the session token: the token itself is never stored. */
  id: string;
  memberId: string;
  expiresAt: Date;
}

export interface MemberRepository {
  /** Creates the member on first sign-in, or refreshes their Discord name and guild roles. */
  saveFromDiscord(identity: DiscordIdentity, roles: readonly MemberRole[]): Promise<Member>;
  findById(id: string): Promise<Member | undefined>;
}

export interface SessionRepository {
  create(session: Session): Promise<void>;
  /** Member of a session that has not expired at the given instant. */
  findMemberId(sessionId: string, now: Date): Promise<string | undefined>;
  delete(sessionId: string): Promise<void>;
}

export interface CharacterRepository {
  listAll(): Promise<Character[]>;
  /** Undefined when the id is unknown or malformed. */
  findById(characterId: string): Promise<Character | undefined>;
  /** In the guild and linked to nobody: what a member may claim. */
  listAvailable(): Promise<Character[]>;
  /** Main first, then by name. */
  listByMember(memberId: string): Promise<Character[]>;
  link(characterId: string, memberId: string): Promise<void>;
  unlink(characterId: string): Promise<void>;
  /** Makes this character the member's only main. */
  setMain(memberId: string, characterId: string): Promise<void>;
  add(entries: readonly RosterEntry[]): Promise<void>;
  changeClass(characterId: string, characterClass: string): Promise<void>;
  setInGuild(characterIds: readonly string[], inGuild: boolean): Promise<void>;
}

export interface JournalRepository {
  record(entry: NewJournalEntry): Promise<void>;
  /** Latest entries first. */
  listRecent(limit: number): Promise<JournalEntry[]>;
}

export interface RaidRepository {
  /** Raids known from data/raids, by name. */
  listAll(): Promise<RaidSummary[]>;
}

export interface EventRepository {
  create(event: NewRaidEvent, createdBy: string): Promise<string>;
  findById(eventId: string): Promise<RaidEvent | undefined>;
  /** Events starting after the given instant, soonest first. */
  listStartingAfter(instant: Date): Promise<RaidEvent[]>;
  setDiscordMessage(eventId: string, messageId: string): Promise<void>;
  /** Events starting after "from" and up to "until" that were not reminded yet, soonest first. */
  listToRemind(from: Date, until: Date): Promise<RaidEvent[]>;
  markReminded(eventId: string, at: Date): Promise<void>;
}

export interface SignupRepository {
  /** Tanks, then healers, then DPS, by character name. */
  listByEvent(eventId: string): Promise<Signup[]>;
  /** The signed-up members' Discord ids, answers and whether they chose soft reserves. */
  listReminderTargets(eventId: string): Promise<ReminderTarget[]>;
  findByMember(eventId: string, memberId: string): Promise<Signup | undefined>;
  /** Creates the sign-up of this character, or updates it. */
  save(signup: SignupChoice & { eventId: string; memberId: string }): Promise<void>;
  delete(eventId: string, characterId: string): Promise<void>;
}

export interface BossLootRepository {
  /** Items dropped by the bosses of these raids, by raid, then boss order, then name; each item once. */
  listForRaids(raidIds: readonly string[]): Promise<LootItem[]>;
}

export interface LootHistoryRepository {
  /** For each item, how many characters signed up to the event already received it. */
  countSignedUpOwners(eventId: string): Promise<Map<number, number>>;
  /** Loots given by one of the methods, latest first. */
  list(limit: number, methods: readonly LootMethod[]): Promise<LootRecord[]>;
  /** For each soft reserve of the event (by reserveKey), what happened at every earlier event, newest first. */
  pastEventsForReserves(eventId: string): Promise<Map<string, PastEventForItem[]>>;
}

export interface SoftReserveRepository {
  listByEvent(eventId: string): Promise<SoftReserve[]>;
  /** The character's soft reserves for the event become exactly these items. */
  replaceForCharacter(eventId: string, characterId: string, itemIds: readonly number[]): Promise<void>;
  deleteForItem(eventId: string, itemId: number): Promise<void>;
}

export interface ExclusionRepository {
  /** Items the officers excluded from soft reserves for this event. */
  listByEvent(eventId: string): Promise<Set<number>>;
  add(eventId: string, itemId: number): Promise<void>;
  remove(eventId: string, itemId: number): Promise<void>;
}

export interface Repositories {
  members: MemberRepository;
  sessions: SessionRepository;
  characters: CharacterRepository;
  journal: JournalRepository;
  raids: RaidRepository;
  events: EventRepository;
  signups: SignupRepository;
  bossLoot: BossLootRepository;
  lootHistory: LootHistoryRepository;
  softReserves: SoftReserveRepository;
  exclusions: ExclusionRepository;
}

/** Runs work atomically: every repository call inside shares one transaction. */
export interface UnitOfWork {
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export type Clock = () => Date;

/** The guild's Discord server, as the bot acts on it. */
export interface GuildGateway {
  /** Sets the member's nickname; false when Discord refuses (server owner, or member ranked above the bot). */
  setNickname(discordId: string, nickname: string): Promise<boolean>;
  /** Gives the member this role, creating it if needed, and takes away the other roles of the group. */
  setOnlyRoleAmong(discordId: string, roleName: string, group: readonly string[]): Promise<void>;
}

/** An event and its sign-ups, as shown in its Discord message. */
export interface AnnouncedRaid {
  event: RaidEvent;
  signups: Signup[];
}

/** The raid channel on Discord, where each event has a sign-up message. */
export interface RaidAnnouncer {
  /** Publishes the event's sign-up message and returns its id. */
  publish(raid: AnnouncedRaid): Promise<string>;
  /** Refreshes the message; false when it no longer exists (deleted on Discord). */
  update(messageId: string, raid: AnnouncedRaid): Promise<boolean>;
  /** Reminds the signed-up members of the raid, in the raid channel. */
  remind(reminder: RaidReminder): Promise<void>;
}
