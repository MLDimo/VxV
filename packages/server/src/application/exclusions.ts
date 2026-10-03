import type { RaidEvent } from "../domain/events.ts";
import type { Member } from "../domain/members.ts";
import type { LootItem } from "../domain/softReserves.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Repositories, UnitOfWork } from "./ports.ts";

/** What the journal keeps about an exclusion change. */
export interface ExclusionRecord {
  itemName: string;
  raids: string[];
  eventStartsAt: string;
  /** Characters whose soft reserve on the item was removed by the exclusion. */
  removedSoftReserves: string[];
}

async function findEventItem(
  repositories: Repositories,
  eventId: string,
  rawItemId: string,
): Promise<{ event: RaidEvent; item: LootItem }> {
  const event = await repositories.events.findById(eventId);
  if (event === undefined) {
    throw new ValidationError("Cet événement n'existe pas.");
  }
  const loot = await repositories.bossLoot.listForRaids(event.raids.map((raid) => raid.id));
  const item = loot.find((candidate) => candidate.itemId === Number(rawItemId));
  if (item === undefined) {
    throw new ValidationError("Cet objet ne tombe pas dans les raids de cet événement.");
  }
  return { event, item };
}

function record(event: RaidEvent, item: LootItem, removedSoftReserves: string[]): ExclusionRecord {
  return {
    itemName: item.name,
    raids: event.raids.map((raid) => raid.name),
    eventStartsAt: event.startsAt.toISOString(),
    removedSoftReserves,
  };
}

export function createExclusions({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** An officer excludes an item from the event's soft reserves; existing reserves on it are removed. */
    async exclude(officer: Member, eventId: string, itemId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async (repositories) => {
        const { event, item } = await findEventItem(repositories, eventId, itemId);
        if ((await repositories.exclusions.listByEvent(event.id)).has(item.itemId)) {
          throw new ValidationError("Cet objet est déjà exclu.");
        }
        const removed = (await repositories.softReserves.listByEvent(event.id))
          .filter((reserve) => reserve.itemId === item.itemId)
          .map((reserve) => reserve.characterName);
        await repositories.softReserves.deleteForItem(event.id, item.itemId);
        await repositories.exclusions.add(event.id, item.itemId);
        await repositories.journal.record({
          actorId: officer.id,
          action: "exclusion.add",
          entity: "item",
          entityId: `${event.id}/${item.itemId}`,
          before: null,
          after: record(event, item, removed),
          reason: motive,
        });
      });
    },

    /** An officer allows an excluded item again. */
    async include(officer: Member, eventId: string, itemId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async (repositories) => {
        const { event, item } = await findEventItem(repositories, eventId, itemId);
        if (!(await repositories.exclusions.listByEvent(event.id)).has(item.itemId)) {
          throw new ValidationError("Cet objet n'est pas exclu.");
        }
        await repositories.exclusions.remove(event.id, item.itemId);
        await repositories.journal.record({
          actorId: officer.id,
          action: "exclusion.remove",
          entity: "item",
          entityId: `${event.id}/${item.itemId}`,
          before: null,
          after: record(event, item, []),
          reason: motive,
        });
      });
    },
  };
}
