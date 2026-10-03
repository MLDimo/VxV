import type { Member } from "../domain/members.ts";
import { checkSignup, type Signup } from "../domain/signups.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

export interface SignupInput {
  characterId: string;
  role: string;
  spec: string;
  status: string;
}

export function createSignups({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    listForEvent(eventId: string): Promise<Signup[]> {
      return unitOfWork.run(({ signups }) => signups.listByEvent(eventId));
    },

    findMine(member: Member, eventId: string): Promise<Signup | undefined> {
      return unitOfWork.run(({ signups }) => signups.findByMember(eventId, member.id));
    },

    /**
     * Signs the member up, or updates their sign-up. Changing character replaces the sign-up,
     * which drops the soft reserves made with the previous character.
     */
    signUp(member: Member, eventId: string, input: SignupInput): Promise<void> {
      return unitOfWork.run(async ({ events, characters, signups }) => {
        const event = await events.findById(eventId);
        if (event === undefined) {
          throw new ValidationError("Cet événement n'existe pas.");
        }
        const check = checkSignup(input, await characters.listByMember(member.id), event.startsAt, clock());
        if (!check.valid) {
          throw new ValidationError(check.refusal);
        }
        const existing = await signups.findByMember(eventId, member.id);
        if (existing !== undefined && existing.characterId !== check.choice.characterId) {
          await signups.delete(eventId, existing.characterId);
        }
        await signups.save({ ...check.choice, eventId, memberId: member.id });
      });
    },
  };
}
