import type { ProfessionReading, Recipe } from "../domain/artisans.ts";
import type { Bet, DiscordMessage, NewBet, SettledStake, Stake } from "../domain/bets.ts";
import type { CashMovement, CashMovementKind } from "../domain/cash.ts";
import type { Appearance, Character } from "../domain/characters.ts";
import type { NewRaidEvent, RaidEvent, RaidSummary } from "../domain/events.ts";
import type { GameChangeOutcome } from "../domain/gameChanges.ts";
import type { LootMethod, LootRecord } from "../domain/history.ts";
import type { JournalEntry, NewJournalEntry } from "../domain/journal.ts";
import type { Member, MemberRole } from "../domain/members.ts";
import type { ReminderTarget } from "../domain/reminders.ts";
import type { RosterEntry } from "../domain/roster.ts";
import type { Signup, SignupChoice } from "../domain/signups.ts";
import type { LootItem, PastEventForItem, SoftReserve } from "../domain/softReserves.ts";
import type {
  CounterReading,
  Mission,
  MissionReward,
  MissionRewardRecord,
  MissionType,
  NewMission,
} from "../domain/missions.ts";
import type { RankedStake } from "../domain/ranking.ts";
import type { TitleAward } from "../domain/titles.ts";
import type { LedgerStake } from "../domain/treasury.ts";

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
  /** Undefined when the id is unknown or malformed. */
  findById(id: string): Promise<Member | undefined>;
  listAll(): Promise<Member[]>;
  /** The member's guild roles, as Discord gives them now. */
  setRoles(memberId: string, roles: readonly MemberRole[]): Promise<void>;
}

export interface SessionRepository {
  create(session: Session): Promise<void>;
  /** Member of a session that has not expired at the given instant. */
  findMemberId(sessionId: string, now: Date): Promise<string | undefined>;
  delete(sessionId: string): Promise<void>;
}

/** A link code handed by the website to the companion, by the hash of the code. */
export interface CompanionCode {
  id: string;
  memberId: string;
  /** PKCE challenge sent by the companion when the link started. */
  challenge: string;
  expiresAt: Date;
}

/** A companion's token, by the hash of the token. */
export interface CompanionToken {
  id: string;
  memberId: string;
  expiresAt: Date;
  /** When the member's roles were last read from Discord. */
  rolesCheckedAt: Date;
}

export interface CompanionRepository {
  createCode(code: CompanionCode): Promise<void>;
  /** Removes the code and returns it, unless it expired; expired codes are removed along the way. */
  takeCode(codeId: string, now: Date): Promise<CompanionCode | undefined>;
  createToken(token: CompanionToken): Promise<void>;
  /** A token that has not expired at the given instant. */
  findToken(tokenId: string, now: Date): Promise<CompanionToken | undefined>;
  /** After the roles were read again from Discord: the token lives on. */
  renewToken(tokenId: string, expiresAt: Date, rolesCheckedAt: Date): Promise<void>;
  deleteToken(tokenId: string): Promise<void>;
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
  /** The character as the game draws it (for the avatars). */
  setAppearance(characterId: string, appearance: Appearance): Promise<void>;
}

export interface JournalRepository {
  record(entry: NewJournalEntry): Promise<void>;
  /** Latest entries first. */
  listRecent(limit: number): Promise<JournalEntry[]>;
  /** Entries about the event (its creation, exclusions, soft reserve corrections), oldest first. */
  listForEvent(eventId: string): Promise<JournalEntry[]>;
}

export interface RaidRepository {
  /** Raids known from data/raids, by name. */
  listAll(): Promise<RaidSummary[]>;
  /** Bosses of these raids, by raid then position. */
  listBosses(raidIds: readonly string[]): Promise<{ encounterId: number; name: string }[]>;
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
  /** Whether the raid's recap was published on Discord already. */
  isRecapPosted(eventId: string): Promise<boolean>;
  markRecapPosted(eventId: string, at: Date): Promise<void>;
}

export interface SignupRepository {
  /** Tanks, then healers, then DPS, by character name. */
  listByEvent(eventId: string): Promise<Signup[]>;
  /** The signed-up members' Discord ids, answers and whether they chose soft reserves. */
  listReminderTargets(eventId: string): Promise<ReminderTarget[]>;
  findByMember(eventId: string, memberId: string): Promise<Signup | undefined>;
  /** Creates the sign-up of this character, or updates it, as changed at the given instant. */
  save(signup: SignupChoice & { eventId: string; memberId: string }, changedAt: Date): Promise<void>;
  /** When the member's sign-up and its soft reserves last changed, or undefined without sign-up. */
  changedAt(eventId: string, memberId: string): Promise<{ signup: Date; reserves: Date | undefined } | undefined>;
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
  /** Undefined when the id is unknown or malformed. */
  findById(lootId: string): Promise<LootRecord | undefined>;
  /** An officer's correction: who received the item, and how it was given. */
  correct(lootId: string, characterId: string, method: LootMethod): Promise<void>;
  /** For each soft reserve of the event (by reserveKey), what happened at every earlier event, newest first. */
  pastEventsForReserves(eventId: string): Promise<Map<string, PastEventForItem[]>>;
  /** The items received since the instant (all of them without one), by the member of the character. */
  listReceivedSince(since: Date | undefined): Promise<{ memberId: string; at: Date }[]>;
}

export interface SoftReserveRepository {
  listByEvent(eventId: string): Promise<SoftReserve[]>;
  /** The character's soft reserves for the event become exactly these items, as changed at the given instant. */
  replaceForCharacter(eventId: string, characterId: string, itemIds: readonly number[], changedAt: Date): Promise<void>;
  deleteForItem(eventId: string, itemId: number): Promise<void>;
}

export interface ExclusionRepository {
  /** Items the officers excluded from soft reserves for this event. */
  listByEvent(eventId: string): Promise<Set<number>>;
  add(eventId: string, itemId: number): Promise<void>;
  remove(eventId: string, itemId: number): Promise<void>;
}

/** A give read in a raid's log, matched with the guild's characters. */
export interface NewLoot {
  encounterId: number;
  itemId: number;
  characterId: string;
  method: LootMethod;
  lootedAt: Date;
}

/** What the addon recorded during a raid: who was present, and the items given. */
export interface RaidRecordRepository {
  /** Characters present at the event; those already recorded stay. Returns how many were not recorded yet. */
  recordAttendance(eventId: string, characterIds: readonly string[]): Promise<number>;
  /** Adds the gives the event does not have yet (same item, boss and instant), and returns those added. */
  addLoots(eventId: string, loots: readonly NewLoot[]): Promise<NewLoot[]>;
}

/** The record of each raid, as the addon exports it (VXV-LOG text), kept to publish its recap. */
export interface RaidLogRepository {
  find(eventId: string): Promise<string | undefined>;
  save(eventId: string, content: string, receivedAt: Date): Promise<void>;
  /** Events started before the instant, whose record is kept and whose recap is not published yet. */
  listUnannounced(startedBefore: Date): Promise<{ event: RaidEvent; content: string }[]>;
  /** The records of the raids started since the instant (all of them without one), with their start. */
  listStartedSince(since: Date | undefined): Promise<{ startsAt: Date; content: string }[]>;
}

/** What became of the changes made in game, by id. */
export interface GameChangeRepository {
  find(changeId: string): Promise<GameChangeOutcome | undefined>;
  save(outcome: GameChangeOutcome, sentBy: string, receivedAt: Date): Promise<void>;
  /** The event's changes, then the events created in game since the given instant, in the order received. */
  listForEvent(eventId: string, createdSince: Date): Promise<GameChangeOutcome[]>;
  /** The stakes made in game on these bets, in the order received. */
  listForBets(betIds: readonly string[]): Promise<GameChangeOutcome[]>;
}

/** When the latest copy of some data, read in game, was imported ("roster"). */
export interface SyncMarkRepository {
  find(kind: string): Promise<Date | undefined>;
  save(kind: string, capturedAt: Date): Promise<void>;
}

export interface BetRepository {
  create(bet: NewBet, createdBy: string, createdAt: Date): Promise<string>;
  /** Undefined when the id is unknown or malformed. */
  findById(betId: string): Promise<Bet | undefined>;
  /** The latest closing first. */
  listRecent(limit: number): Promise<Bet[]>;
  setDiscordMessage(betId: string, message: DiscordMessage): Promise<void>;
  /** The bet ends: its winning choice, or none when it is cancelled. */
  end(betId: string, winningChoiceId: string | undefined, endedAt: Date): Promise<void>;
}

export interface StakeRepository {
  /** The bet's stakes, in the order they were placed. */
  listByBet(betId: string): Promise<Stake[]>;
  /** The stakes of these bets, in the order they were placed. */
  listByBets(betIds: readonly string[]): Promise<Stake[]>;
  /** Creates the member's stake on the bet, or moves it to this choice and amount, as placed at the instant. */
  save(stake: Pick<Stake, "betId" | "memberId" | "choiceId" | "amount">, placedAt: Date): Promise<void>;
  delete(betId: string, memberId: string): Promise<void>;
  /** Undefined when the id is unknown or malformed. */
  findById(stakeId: string): Promise<Stake | undefined>;
  /** Every stake of the member, on every bet. */
  listByMember(memberId: string): Promise<Stake[]>;
  /** What each stake of an ended bet brought back. */
  settle(stakes: readonly SettledStake[]): Promise<void>;
  /** The treasurer received the stake (or the debt it became). */
  markPaid(stakeId: string, treasurerId: string, at: Date): Promise<void>;
  /** The treasurer handed the member what the stake brought back. */
  markCollected(stakeId: string, treasurerId: string, at: Date): Promise<void>;
  /** Stakes the treasurer still has to deal with: not paid, or whose gain is not handed over yet. */
  listPending(): Promise<LedgerStake[]>;
  /** Stakes the treasurer validated, the latest validation first. */
  listValidated(limit: number): Promise<LedgerStake[]>;
  /** The stakes of every ended bet, with when it ended, for the rankings. */
  listRanked(): Promise<RankedStake[]>;
}

export interface MissionRepository {
  create(mission: NewMission, createdBy: string, createdAt: Date): Promise<string>;
  /** Undefined when the id is unknown or malformed. */
  findById(missionId: string): Promise<Mission | undefined>;
  /** The latest ending first. */
  listRecent(limit: number): Promise<Mission[]>;
  /** Every closed mission, for the hall of fame. */
  listClosed(): Promise<Mission[]>;
  close(missionId: string, closedBy: string, at: Date): Promise<void>;
  setDiscordMessage(missionId: string, message: DiscordMessage): Promise<void>;
}

/** A reading as an addon made it, for a character of the guild. */
export interface NewCounterReading {
  characterId: string;
  type: MissionType;
  value: number;
  readAt: Date;
}

export interface CounterReadingRepository {
  /** Keeps the readings not known yet; returns how many were new. */
  add(readings: readonly NewCounterReading[], sentBy: string): Promise<number>;
  /** The readings of this counter up to the instant, for the characters linked to a member. */
  listUntil(type: MissionType, until: Date): Promise<CounterReading[]>;
}

/** A character's profession as the website keeps it (P14), with who plays the character. */
export interface ArtisanProfession {
  characterId: string;
  /** "Prénom Nom". */
  characterName: string;
  characterClass: string;
  memberId: string | undefined;
  professionId: number;
  name: string;
  level: number;
  maxLevel: number;
  readAt: Date;
  /** Undefined while the profession's window was never opened in game. */
  recipesReadAt: Date | undefined;
}

export interface KnownRecipe {
  characterId: string;
  professionId: number;
  recipeId: number;
}

export interface ProfessionRepository {
  /**
   * Keeps the profession's level when read later than the known one, and its recipes when read later than the known
   * ones; returns whether anything changed.
   */
  save(characterId: string, reading: ProfessionReading, sentBy: string): Promise<boolean>;
  /** The guild's characters' professions, the guild's characters only. */
  listAll(): Promise<ArtisanProfession[]>;
  listRecipes(): Promise<(Recipe & { professionId: number })[]>;
  listKnown(): Promise<KnownRecipe[]>;
}

/** A player of a deathroll: their character, and the member who plays it, shown by their main character. */
export interface DeathrollPlayer {
  characterId: string;
  /** "Prénom Nom". */
  name: string;
  characterClass: string;
  memberId: string | undefined;
  memberName: string | undefined;
  memberClass: string | undefined;
}

/** A deathroll as the website keeps it (P15). */
export interface StoredDeathroll {
  id: string;
  challenger: DeathrollPlayer;
  challenged: DeathrollPlayer;
  stake: number;
  start: number;
  acceptedAt: Date;
  endedAt: Date;
  loserCharacterId: string;
  betId: string | undefined;
  /** When the winner confirmed the payment; the loser owes the stake until then. */
  paidAt: Date | undefined;
  rolls: { characterId: string; high: number; result: number }[];
}

export interface NewDeathroll {
  id: string;
  challengerId: string;
  challengedId: string;
  stake: number;
  start: number;
  acceptedAt: Date;
  endedAt: Date;
  loserId: string;
  betId: string | undefined;
  rolls: { characterId: string; high: number; result: number }[];
}

export interface DeathrollRepository {
  find(id: string): Promise<StoredDeathroll | undefined>;
  save(game: NewDeathroll, sentBy: string, recordedAt: Date): Promise<void>;
  /** Notes the payment confirmed; false when it was already. */
  markPaid(id: string, at: Date): Promise<boolean>;
  /** Every game, the latest first. */
  listAll(): Promise<StoredDeathroll[]>;
}

export interface MissionRewardRepository {
  save(missionId: string, rewards: readonly MissionReward[]): Promise<void>;
  /** The rewards of these missions, by mission then place. */
  listForMissions(missionIds: readonly string[]): Promise<MissionRewardRecord[]>;
  /** The treasurer handed the reward over. */
  markPaid(missionId: string, rank: number, treasurerId: string, at: Date): Promise<void>;
}

/** A title's holder for a week, with what the website shows of them. */
export interface TitleHolder {
  week: string;
  titleId: string;
  memberId: string;
  memberName: string;
  memberClass: string | undefined;
  discordId: string;
  /** None for a title an officer gave. */
  score: number | undefined;
}

export interface TitleRepository {
  saveWeek(week: string, awards: readonly TitleAward[], awardedAt: Date): Promise<void>;
  /** An officer gives the title to the member for the week, in place of its holder if any. */
  give(week: string, titleId: string, memberId: string, givenAt: Date): Promise<void>;
  /** The holders of the latest weeks, the latest week first. */
  listLatestWeeks(weeks: number): Promise<TitleHolder[]>;
}

export interface Season {
  number: number;
  startedAt: Date;
}

export interface SeasonRepository {
  /** The latest season started, if any. */
  current(): Promise<Season | undefined>;
  /** Starts the next season and returns it. */
  start(startedBy: string, at: Date): Promise<Season>;
}

/** A movement of the guild's cash, as recorded: its amount signed. */
export interface CashRecord {
  kind: CashMovementKind;
  amount: number;
  label: string;
  reason: string;
  recordedBy: string;
  betId: string | undefined;
  memberId: string | undefined;
  /** The mission whose reward was handed over. */
  missionId?: string;
}

export interface CashRepository {
  record(movement: CashRecord, occurredAt: Date): Promise<void>;
  /** Every movement, the latest first. */
  listAll(): Promise<CashMovement[]>;
}

export interface Repositories {
  members: MemberRepository;
  sessions: SessionRepository;
  companion: CompanionRepository;
  characters: CharacterRepository;
  journal: JournalRepository;
  raids: RaidRepository;
  events: EventRepository;
  signups: SignupRepository;
  bossLoot: BossLootRepository;
  lootHistory: LootHistoryRepository;
  softReserves: SoftReserveRepository;
  exclusions: ExclusionRepository;
  raidRecords: RaidRecordRepository;
  raidLogs: RaidLogRepository;
  syncMarks: SyncMarkRepository;
  gameChanges: GameChangeRepository;
  bets: BetRepository;
  stakes: StakeRepository;
  cash: CashRepository;
  seasons: SeasonRepository;
  missions: MissionRepository;
  counterReadings: CounterReadingRepository;
  missionRewards: MissionRewardRepository;
  professions: ProfessionRepository;
  deathrolls: DeathrollRepository;
  titles: TitleRepository;
}

/** Runs work atomically: every repository call inside shares one transaction. */
export interface UnitOfWork {
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export type Clock = () => Date;
