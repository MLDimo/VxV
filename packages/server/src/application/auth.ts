import { rolesFromDiscordRoles, type DiscordRoleMapping, type Member } from "../domain/members.ts";
import type { Clock, DiscordIdentity, MemberRepository, UnitOfWork } from "./ports.ts";
import { generateSecretToken, hashSecret } from "./secretTokens.ts";

/** Guild roles are read from Discord at sign-in, so a session is kept short to pick up role changes. */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthDependencies {
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
  /** Records a user of the guild's Discord server with their current name and roles. */
  const save = (members: MemberRepository, identity: DiscordIdentity, discordRoleIds: readonly string[]) =>
    members.saveFromDiscord(identity, rolesFromDiscordRoles(discordRoleIds, discordRoles));

  return {
    /** Opens a session for a user on the guild's Discord server, recording their current name and roles. */
    async signIn(identity: DiscordIdentity, discordRoleIds: readonly string[]): Promise<SignedIn> {
      const token = generateSecretToken();
      const expiresAt = new Date(clock().getTime() + SESSION_DURATION_MS);
      const member = await unitOfWork.run(async ({ members, sessions }) => {
        const saved = await save(members, identity, discordRoleIds);
        await sessions.create({ id: hashSecret(token), memberId: saved.id, expiresAt });
        return saved;
      });
      return { token, expiresAt, member };
    },

    /** The member acting through the bot, recorded as a sign-in would, without any session. */
    identify(identity: DiscordIdentity, discordRoleIds: readonly string[]): Promise<Member> {
      return unitOfWork.run(({ members }) => save(members, identity, discordRoleIds));
    },

    /** Member owning a valid session token, or undefined. */
    authenticate(token: string): Promise<Member | undefined> {
      return unitOfWork.run(async ({ members, sessions }) => {
        const memberId = await sessions.findMemberId(hashSecret(token), clock());
        return memberId === undefined ? undefined : members.findById(memberId);
      });
    },

    signOut(token: string): Promise<void> {
      return unitOfWork.run(({ sessions }) => sessions.delete(hashSecret(token)));
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
