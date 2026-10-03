import type { Character } from "../domain/characters.ts";
import type { JournalEntry, NewJournalEntry } from "../domain/journal.ts";
import type { Member, MemberRole } from "../domain/members.ts";
import type { RosterEntry } from "../domain/roster.ts";

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
  /** Creates the member on first sign-in, or refreshes their Discord name and guild role. */
  saveFromDiscord(identity: DiscordIdentity, role: MemberRole): Promise<Member>;
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

export interface Repositories {
  members: MemberRepository;
  sessions: SessionRepository;
  characters: CharacterRepository;
  journal: JournalRepository;
}

/** Runs work atomically: every repository call inside shares one transaction. */
export interface UnitOfWork {
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export type Clock = () => Date;
