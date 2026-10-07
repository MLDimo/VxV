import { eventRoleRefusal, type EventRole } from "../domain/eventRoles.ts";
import type { Member } from "../domain/members.ts";
import { OLDER_THAN_WEBSITE } from "../domain/gameChanges.ts";
import { checkSignup, type Signup } from "../domain/signups.ts";
import type { GuildGateway } from "./discordPorts.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

const NO_EVENT = "Cet événement n'existe pas.";
const DISCORD_UNREACHABLE = "Discord ne répond pas : ton rôle ne peut pas être vérifié, réessaie dans un instant.";

export interface SignupInput {
  characterId: string;
  role: string;
  spec: string;
  status: string;
}

/** When a change happened: now, or when it was made in game, never later than now (a clock ahead). */
export function changeInstant(madeAt: Date | undefined, now: Date): Date {
  return madeAt === undefined || madeAt.getTime() > now.getTime() ? now : madeAt;
}

interface SignupsDependencies {
  unitOfWork: UnitOfWork;
  clock: Clock;
  /** The guild's Discord server, where a member's roles are read. */
  guild: GuildGateway;
}

export function createSignups({ unitOfWork, clock, guild }: SignupsDependencies) {
  /** Refuses a member without the event's role, as Discord tells now: a role given a minute ago counts. */
  async function checkRole(member: Member, role: EventRole): Promise<void> {
    let held: string[] | undefined;
    try {
      held = await guild.fetchRoleIds(member.discordId);
    } catch (error) {
      console.error("Discord roles check of a sign-up failed", error);
      throw new ValidationError(DISCORD_UNREACHABLE);
    }
    const refusal = eventRoleRefusal(role, held);
    if (refusal !== undefined) {
      throw new ValidationError(refusal);
    }
  }

  return {
    listForEvent(eventId: string): Promise<Signup[]> {
      return unitOfWork.run(({ signups }) => signups.listByEvent(eventId));
    },

    findMine(member: Member, eventId: string): Promise<Signup | undefined> {
      return unitOfWork.run(({ signups }) => signups.findByMember(eventId, member.id));
    },

    /**
     * Signs the member up, or updates their sign-up. Changing character replaces the sign-up,
     * which drops the soft reserves made with the previous character. A change made in game earlier (madeAt) than
     * the sign-up's latest change is refused: the latest wins (P9.4). Only the holders of the event's role sign up;
     * a member signed up already keeps their sign-up and may change it, even without the role any more.
     */
    async signUp(member: Member, eventId: string, input: SignupInput, madeAt?: Date): Promise<void> {
      const changedAt = changeInstant(madeAt, clock());
      const found = await unitOfWork.run(async ({ events, signups }) => {
        const event = await events.findById(eventId);
        return event && { event, signedUp: (await signups.findByMember(eventId, member.id)) !== undefined };
      });
      if (found === undefined) {
        throw new ValidationError(NO_EVENT);
      }
      const { event, signedUp } = found;
      if (event.role !== undefined && !signedUp) {
        await checkRole(member, event.role);
      }
      return unitOfWork.run(async ({ characters, signups }) => {
        const changed = madeAt && (await signups.changedAt(eventId, member.id));
        if (changed && changed.signup.getTime() > changedAt.getTime()) {
          throw new ValidationError(OLDER_THAN_WEBSITE);
        }
        const check = checkSignup(input, await characters.listByMember(member.id), event.startsAt, clock());
        if (!check.valid) {
          throw new ValidationError(check.refusal);
        }
        const existing = await signups.findByMember(eventId, member.id);
        if (existing !== undefined && existing.characterId !== check.choice.characterId) {
          await signups.delete(eventId, existing.characterId);
        }
        await signups.save({ ...check.choice, eventId, memberId: member.id }, changedAt);
      });
    },
  };
}
