import type { GuildEvent } from "../domain/events.ts";
import type { ExclusionRecord, NewJournalEntry } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import type { LootItem } from "../domain/softReserves.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Repositories, UnitOfWork } from "./ports.ts";

/** The event's item an officer changes, checked to be excluded (or not) before the change. */
async function findEventItem(
  repositories: Repositories,
  eventId: string,
  rawItemId: string,
  excluded: boolean,
): Promise<{ event: GuildEvent; item: LootItem }> {
  const event = await repositories.events.findById(eventId);
  if (event === undefined) {
    throw new ValidationError("Cet événement n'existe pas.");
  }
  const loot = await repositories.bossLoot.listForRaids(event.raids.map((raid) => raid.id));
  const item = loot.find((candidate) => candidate.itemId === Number(rawItemId));
  if (item === undefined) {
    throw new ValidationError("Cet objet ne tombe pas dans les raids de cet événement.");
  }
  if ((await repositories.exclusions.listByEvent(event.id)).has(item.itemId) !== excluded) {
    throw new ValidationError(excluded ? "Cet objet n'est pas exclu." : "Cet objet est déjà exclu.");
  }
  return { event, item };
}

function journalEntry(
  officer: Member,
  action: "exclusion.add" | "exclusion.remove",
  { event, item }: { event: GuildEvent; item: LootItem },
  removedSoftReserves: string[],
  reason: string,
): NewJournalEntry {
  const after: ExclusionRecord = {
    itemName: item.name,
    raids: event.raids.map((raid) => raid.name),
    eventStartsAt: event.startsAt.toISOString(),
    removedSoftReserves,
  };
  return {
    actorId: officer.id,
    action,
    entity: "item",
    entityId: `${event.id}/${item.itemId}`,
    before: null,
    after,
    reason,
  };
}

export function createExclusions({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** An officer excludes an item from the event's soft reserves; existing reserves on it are removed. */
    async exclude(officer: Member, eventId: string, itemId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async (repositories) => {
        const found = await findEventItem(repositories, eventId, itemId, false);
        const { event, item } = found;
        const removed = (await repositories.softReserves.listByEvent(event.id))
          .filter((reserve) => reserve.itemId === item.itemId)
          .map((reserve) => reserve.characterName);
        await repositories.softReserves.deleteForItem(event.id, item.itemId);
        await repositories.exclusions.add(event.id, item.itemId);
        await repositories.journal.record(journalEntry(officer, "exclusion.add", found, removed, motive));
      });
    },

    /** An officer allows an excluded item again. */
    async include(officer: Member, eventId: string, itemId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async (repositories) => {
        const found = await findEventItem(repositories, eventId, itemId, true);
        await repositories.exclusions.remove(found.event.id, found.item.itemId);
        await repositories.journal.record(journalEntry(officer, "exclusion.remove", found, [], motive));
      });
    },
  };
}
