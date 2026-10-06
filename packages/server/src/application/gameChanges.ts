import { fullName, type Character } from "../domain/characters.ts";
import { acceptedMessage, type GameChange, type GameChangeOutcome } from "../domain/gameChanges.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { ApplicationError } from "./errors.ts";
import type { UnitOfWork } from "./ports.ts";
import type { SignupInput } from "./signups.ts";

const UNKNOWN_AUTHOR = "Ce personnage n'est lié à aucun membre sur le site : lie-le avec /vxv_main ou /vxv_reroll.";

/** The use cases a change goes through: each checks the author's rights as on the website. */
export interface GameChangeDependencies {
  unitOfWork: UnitOfWork;
  signups: { signUp(member: Member, eventId: string, input: SignupInput): Promise<void> };
  softReserves: { setMine(member: Member, eventId: string, itemIds: readonly string[]): Promise<void> };
  exclusions: {
    exclude(officer: Member, eventId: string, itemId: string, reason: string): Promise<void>;
    include(officer: Member, eventId: string, itemId: string, reason: string): Promise<void>;
  };
  /** The event's message on Discord follows its sign-ups. */
  announcements: { announceQuietly(eventId: string): Promise<boolean> };
}

export function createGameChanges({
  unitOfWork,
  signups,
  softReserves,
  exclusions,
  announcements,
}: GameChangeDependencies) {
  /** Does the change as its author's member would on the website. */
  async function perform(author: { character: Character; member: Member }, change: GameChange): Promise<void> {
    switch (change.kind) {
      case "signup":
        await signups.signUp(author.member, change.eventId, {
          characterId: author.character.id,
          role: change.role,
          spec: change.spec,
          status: change.status,
        });
        await announcements.announceQuietly(change.eventId);
        return;
      case "reserves":
        return softReserves.setMine(author.member, change.eventId, change.itemIds.map(String));
      case "exclusion":
        return (change.excluded ? exclusions.exclude : exclusions.include)(
          author.member,
          change.eventId,
          String(change.itemId),
          change.reason,
        );
    }
  }

  /** The author's character and member, when the character is linked to one. */
  function findAuthor(name: string) {
    return unitOfWork.run(async ({ characters, members }) => {
      const character = (await characters.listAll()).find((candidate) => fullName(candidate) === name);
      const member = character?.memberId === undefined ? undefined : await members.findById(character.memberId);
      return character && member && { character, member };
    });
  }

  /** What becomes of one change; undefined when it cannot be kept (unknown event, or relayed by a member). */
  async function receiveOne(sender: Member, change: GameChange): Promise<GameChangeOutcome | undefined> {
    const known = await unitOfWork.run(async ({ gameChanges, events }) => ({
      outcome: await gameChanges.find(change.id),
      event: await events.findById(change.eventId),
    }));
    if (known.outcome !== undefined || known.event === undefined) {
      return known.outcome;
    }
    const author = await findAuthor(change.author);
    // Only an officer relays the changes of other players: their addon heard them from the author in game.
    if (author !== undefined && author.member.id !== sender.id && !canManageRaids(sender.roles)) {
      return undefined;
    }
    const base = { id: change.id, eventId: change.eventId, author: change.author };
    let outcome: GameChangeOutcome;
    if (author === undefined) {
      outcome = { ...base, accepted: false, message: UNKNOWN_AUTHOR };
    } else {
      try {
        await perform(author, change);
        outcome = { ...base, accepted: true, message: acceptedMessage(change) };
      } catch (error) {
        if (!(error instanceof ApplicationError)) {
          throw error;
        }
        outcome = { ...base, accepted: false, message: error.message };
      }
    }
    await unitOfWork.run(({ gameChanges }) => gameChanges.save(outcome, sender.id));
    return outcome;
  }

  return {
    /**
     * The changes made in game that a companion sends (P7.5): its member's own, and for an officer those relayed
     * from other players. Each is done once, as its author would on the website, rights checked; what became of it
     * goes back to the game with the event's data.
     */
    async receive(sender: Member, changes: readonly GameChange[]): Promise<GameChangeOutcome[]> {
      const outcomes: GameChangeOutcome[] = [];
      for (const change of changes) {
        const outcome = await receiveOne(sender, change);
        if (outcome !== undefined) {
          outcomes.push(outcome);
        }
      }
      return outcomes;
    },
  };
}
