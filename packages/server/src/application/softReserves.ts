import type { RaidEvent } from "../domain/events.ts";
import type { Member } from "../domain/members.ts";
import type { Signup } from "../domain/signups.ts";
import { buildBoard, checkSoftReserveChoice, type BoardItem } from "../domain/softReserves.ts";
import { ValidationError } from "./errors.ts";
import type { Repositories, UnitOfWork } from "./ports.ts";

export interface SoftReserveBoard {
  allowance: number;
  items: BoardItem[];
  /** The viewer's sign-up: soft reserves are made with its character. */
  mySignup: Signup | undefined;
}

async function requireEvent(repositories: Repositories, eventId: string): Promise<RaidEvent> {
  const event = await repositories.events.findById(eventId);
  if (event === undefined) {
    throw new ValidationError("Cet événement n'existe pas.");
  }
  return event;
}

export function createSoftReserves({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** The event's loot with everyone's soft reserves: visible to the whole guild. */
    getBoard(member: Member, eventId: string): Promise<SoftReserveBoard | undefined> {
      return unitOfWork.run(async (repositories) => {
        const event = await repositories.events.findById(eventId);
        if (event === undefined) {
          return undefined;
        }
        const [loot, reserves, excluded, owners, mySignup] = await Promise.all([
          repositories.bossLoot.listForRaids(event.raids.map((raid) => raid.id)),
          repositories.softReserves.listByEvent(event.id),
          repositories.exclusions.listByEvent(event.id),
          repositories.lootHistory.countSignedUpOwners(event.id),
          repositories.signups.findByMember(event.id, member.id),
        ]);
        return {
          allowance: event.softReservesPerPlayer,
          items: buildBoard(loot, reserves, excluded, owners, mySignup?.characterId),
          mySignup,
        };
      });
    },

    /** The member's soft reserves for the event become the chosen items. */
    setMine(member: Member, eventId: string, itemIds: readonly string[]): Promise<void> {
      return unitOfWork.run(async (repositories) => {
        const event = await requireEvent(repositories, eventId);
        const signup = await repositories.signups.findByMember(event.id, member.id);
        if (signup === undefined) {
          throw new ValidationError("Inscrivez-vous à l'événement avant de choisir vos SR.");
        }
        const [loot, excluded] = await Promise.all([
          repositories.bossLoot.listForRaids(event.raids.map((raid) => raid.id)),
          repositories.exclusions.listByEvent(event.id),
        ]);
        const check = checkSoftReserveChoice(itemIds, {
          allowance: event.softReservesPerPlayer,
          lootItemIds: new Set(loot.map((item) => item.itemId)),
          excludedItemIds: excluded,
        });
        if (!check.valid) {
          throw new ValidationError(check.refusal);
        }
        await repositories.softReserves.replaceForCharacter(event.id, signup.characterId, check.itemIds);
      });
    },
  };
}
