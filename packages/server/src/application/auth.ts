import { rolesFromDiscordRoles, type DiscordRoleMapping, type Member } from "../domain/members.ts";
import type { Clock, DiscordIdentity, UnitOfWork } from "./ports.ts";
import { generateSessionToken, sessionIdFromToken } from "./sessionTokens.ts";

/** Guild roles are read from Discord at sign-in, so a session is kept short to pick up role changes. */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export class NotGuildMemberError extends Error {
  constructor() {
    super("Ce compte Discord n'a aucun rôle de la guilde sur le serveur.");
    this.name = "NotGuildMemberError";
  }
}

export interface AuthDependencies {
  unitOfWork: UnitOfWork;
  clock: Clock;
  discordRoles: DiscordRoleMapping;
}

export interface SignedIn {
  token: string;
  expiresAt: Date;
  member: Member;
}

export function createAuth({ unitOfWork, clock, discordRoles }: AuthDependencies) {
  return {
    /** Opens a session for a Discord user who holds a guild role, recording their current name and roles. */
    async signIn(identity: DiscordIdentity, discordRoleIds: readonly string[]): Promise<SignedIn> {
      const roles = rolesFromDiscordRoles(discordRoleIds, discordRoles);
      if (roles.length === 0) {
        throw new NotGuildMemberError();
      }
      const token = generateSessionToken();
      const expiresAt = new Date(clock().getTime() + SESSION_DURATION_MS);
      const member = await unitOfWork.run(async ({ members, sessions }) => {
        const saved = await members.saveFromDiscord(identity, roles);
        await sessions.create({ id: sessionIdFromToken(token), memberId: saved.id, expiresAt });
        return saved;
      });
      return { token, expiresAt, member };
    },

    /** Member owning a valid session token, or undefined. */
    authenticate(token: string): Promise<Member | undefined> {
      return unitOfWork.run(async ({ members, sessions }) => {
        const memberId = await sessions.findMemberId(sessionIdFromToken(token), clock());
        return memberId === undefined ? undefined : members.findById(memberId);
      });
    },

    signOut(token: string): Promise<void> {
      return unitOfWork.run(({ sessions }) => sessions.delete(sessionIdFromToken(token)));
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
