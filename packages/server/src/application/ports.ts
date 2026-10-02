import type { Member, MemberRole } from "../domain/members.ts";

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

export interface Repositories {
  members: MemberRepository;
  sessions: SessionRepository;
}

/** Runs work atomically: every repository call inside shares one transaction. */
export interface UnitOfWork {
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export type Clock = () => Date;
