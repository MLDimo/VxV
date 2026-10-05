import { rolesFromDiscordRoles, type DiscordRoleMapping, type Member } from "../domain/members.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, GuildGateway, UnitOfWork } from "./ports.ts";
import { generateSecretToken, hashSecret, verifierMatches } from "./secretTokens.ts";

/** A link code is exchanged as soon as the browser hands it to the companion. */
export const COMPANION_CODE_DURATION_MS = 5 * 60 * 1000;
/** A companion left unused this long must be linked again. */
export const COMPANION_TOKEN_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
/** The member's roles are read again from Discord this often: rights follow the guild's roles. */
export const COMPANION_ROLES_CHECK_MS = 60 * 60 * 1000;

/** PKCE challenge: the base64url SHA-256 of the companion's verifier. */
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

const INVALID_LINK = "Ce lien de liaison n'est pas valide : relance la liaison depuis le compagnon.";
const LINK_FAILED = "La liaison a échoué ou a expiré : relance-la depuis le compagnon.";

export interface CompanionLink {
  token: string;
  member: Member;
}

export interface CompanionDependencies {
  unitOfWork: UnitOfWork;
  clock: Clock;
  discordRoles: DiscordRoleMapping;
  guild: GuildGateway;
}

export function createCompanion({ unitOfWork, clock, discordRoles, guild }: CompanionDependencies) {
  const tokenExpiry = (now: Date) => new Date(now.getTime() + COMPANION_TOKEN_DURATION_MS);

  /** Reads the member's roles on Discord: the token is renewed, or removed when the member left the server. */
  async function checkRoles(tokenId: string, member: Member, now: Date): Promise<Member | undefined> {
    let roleIds: string[] | undefined;
    try {
      roleIds = await guild.fetchRoleIds(member.discordId);
    } catch (error) {
      // Discord out of reach: the known roles stay until the next request checks again.
      console.error("Discord roles check of a companion failed", error);
      return member;
    }
    if (roleIds === undefined) {
      await unitOfWork.run(({ companion }) => companion.deleteToken(tokenId));
      return undefined;
    }
    const roles = rolesFromDiscordRoles(roleIds, discordRoles);
    await unitOfWork.run(async ({ companion, members }) => {
      await members.setRoles(member.id, roles);
      await companion.renewToken(tokenId, tokenExpiry(now), now);
    });
    return { ...member, roles };
  }

  return {
    /**
     * The signed-in member links the companion that sent this PKCE challenge. The code returned goes back to the
     * companion through the browser, and is worth nothing without the companion's secret.
     */
    async startLink(member: Member, challenge: string): Promise<string> {
      if (!CHALLENGE.test(challenge)) {
        throw new ValidationError(INVALID_LINK);
      }
      const code = generateSecretToken();
      const expiresAt = new Date(clock().getTime() + COMPANION_CODE_DURATION_MS);
      await unitOfWork.run(({ companion }) =>
        companion.createCode({ id: hashSecret(code), memberId: member.id, challenge, expiresAt }),
      );
      return code;
    },

    /** The companion proves it started the link (PKCE verifier) and receives its token. A code serves once. */
    async finishLink(code: string, verifier: string): Promise<CompanionLink> {
      const now = clock();
      const link = await unitOfWork.run(async ({ companion, members }) => {
        const taken = await companion.takeCode(hashSecret(code), now);
        if (taken === undefined || !verifierMatches(verifier, taken.challenge)) {
          return undefined;
        }
        const member = await members.findById(taken.memberId);
        if (member === undefined) {
          return undefined;
        }
        const token = generateSecretToken();
        await companion.createToken({
          id: hashSecret(token),
          memberId: member.id,
          expiresAt: tokenExpiry(now),
          rolesCheckedAt: now,
        });
        return { token, member };
      });
      if (link === undefined) {
        throw new ValidationError(LINK_FAILED);
      }
      return link;
    },

    /**
     * The member a companion acts for; undefined when its token is unknown or expired, or when the member left the
     * guild's Discord server. Roles checked too long ago are read again from Discord.
     */
    async authenticate(token: string): Promise<Member | undefined> {
      const tokenId = hashSecret(token);
      const now = clock();
      const found = await unitOfWork.run(async ({ companion, members }) => {
        const stored = await companion.findToken(tokenId, now);
        const member = stored && (await members.findById(stored.memberId));
        return stored && member && { stored, member };
      });
      if (found === undefined) {
        return undefined;
      }
      if (now.getTime() - found.stored.rolesCheckedAt.getTime() < COMPANION_ROLES_CHECK_MS) {
        return found.member;
      }
      return checkRoles(tokenId, found.member, now);
    },

    /** The companion forgets the member: its token stops working. */
    unlink(token: string): Promise<void> {
      return unitOfWork.run(({ companion }) => companion.deleteToken(hashSecret(token)));
    },
  };
}

export type Companion = ReturnType<typeof createCompanion>;
