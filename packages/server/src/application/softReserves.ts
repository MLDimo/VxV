import type { RaidEvent } from "../domain/events.ts";
import type { SoftReserveOverrideRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import type { Signup } from "../domain/signups.ts";
import {
  areSoftReservesLocked,
  buildBoard,
  checkSoftReserveChoice,
  softReservesLockAt,
  type BoardItem,
} from "../domain/softReserves.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, Repositories, UnitOfWork } from "./ports.ts";

export interface SoftReserveBoard {
  allowance: number;
  items: BoardItem[];
  /** The viewer's sign-up: soft reserves are made with its character. */
  mySignup: Signup | undefined;
  lockAt: Date;
  locked: boolean;
}

async function requireEvent(repositories: Repositories, eventId: string): Promise<RaidEvent> {
  const event = await repositories.events.findById(eventId);
  if (event === undefined) {
    throw new ValidationError("Cet événement n'existe pas.");
  }
  return event;
}

/** Checks the chosen items against the event's loot, exclusions and allowance; returns the item ids. */
async function checkChoice(repositories: Repositories, event: RaidEvent, itemIds: readonly string[]) {
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
  return { itemIds: check.itemIds, loot };
}

/** The event's loot with everyone's soft reserves and their SR+ bonus; "mine" marks the given character's. */
export async function loadBoardItems(
  repositories: Repositories,
  event: RaidEvent,
  myCharacterId: string | undefined,
): Promise<BoardItem[]> {
  const [loot, reserves, excludedItemIds, ownersByItem, pastEventsByReserve] = await Promise.all([
    repositories.bossLoot.listForRaids(event.raids.map((raid) => raid.id)),
    repositories.softReserves.listByEvent(event.id),
    repositories.exclusions.listByEvent(event.id),
    repositories.lootHistory.countSignedUpOwners(event.id),
    repositories.lootHistory.pastEventsForReserves(event.id),
  ]);
  return buildBoard({ loot, reserves, excludedItemIds, ownersByItem, pastEventsByReserve, myCharacterId });
}

export function createSoftReserves({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /** The event's loot with everyone's soft reserves: visible to the whole guild. */
    getBoard(member: Member, eventId: string): Promise<SoftReserveBoard | undefined> {
      return unitOfWork.run(async (repositories) => {
        const event = await repositories.events.findById(eventId);
        if (event === undefined) {
          return undefined;
        }
        const mySignup = await repositories.signups.findByMember(event.id, member.id);
        return {
          allowance: event.softReservesPerPlayer,
          items: await loadBoardItems(repositories, event, mySignup?.characterId),
          mySignup,
          lockAt: softReservesLockAt(event.startsAt),
          locked: areSoftReservesLocked(event.startsAt, clock()),
        };
      });
    },

    /** The member's soft reserves for the event become the chosen items, until the lock. */
    setMine(member: Member, eventId: string, itemIds: readonly string[]): Promise<void> {
      return unitOfWork.run(async (repositories) => {
        const event = await requireEvent(repositories, eventId);
        if (areSoftReservesLocked(event.startsAt, clock())) {
          throw new ValidationError(
            "Les SR sont verrouillées 30 minutes avant le raid : seul un officier peut encore les modifier.",
          );
        }
        const signup = await repositories.signups.findByMember(event.id, member.id);
        if (signup === undefined) {
          throw new ValidationError("Inscrivez-vous à l'événement avant de choisir vos SR.");
        }
        const { itemIds: checked } = await checkChoice(repositories, event, itemIds);
        await repositories.softReserves.replaceForCharacter(event.id, signup.characterId, checked);
      });
    },

    /** An officer corrects the soft reserves of a signed-up character, even after the lock, with a reason. */
    async override(
      officer: Member,
      eventId: string,
      characterId: string,
      itemIds: readonly string[],
      reason: string,
    ): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async (repositories) => {
        const event = await requireEvent(repositories, eventId);
        const signup = (await repositories.signups.listByEvent(event.id)).find(
          (candidate) => candidate.characterId === characterId,
        );
        if (signup === undefined) {
          throw new ValidationError("Ce personnage n'est pas inscrit à l'événement.");
        }
        const { itemIds: checked, loot } = await checkChoice(repositories, event, itemIds);
        const nameOf = (itemId: number) => loot.find((item) => item.itemId === itemId)?.name ?? String(itemId);
        const before = (await repositories.softReserves.listByEvent(event.id))
          .filter((reserve) => reserve.characterId === characterId)
          .map((reserve) => nameOf(reserve.itemId));
        await repositories.softReserves.replaceForCharacter(event.id, characterId, checked);
        const record: SoftReserveOverrideRecord = {
          characterName: signup.characterName,
          raids: event.raids.map((raid) => raid.name),
          eventStartsAt: event.startsAt.toISOString(),
          before,
          after: checked.map(nameOf),
        };
        await repositories.journal.record({
          actorId: officer.id,
          action: "softReserve.override",
          entity: "softReserve",
          entityId: `${event.id}/${characterId}`,
          before: null,
          after: record,
          reason: motive,
        });
      });
    },
  };
}
