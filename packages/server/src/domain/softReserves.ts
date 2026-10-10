import { classLabel } from "./characterClasses.ts";
import { canEquip, type ItemKind } from "./equipment.ts";

/** An item that a boss of the event's raids can drop. */
export interface LootItem {
  itemId: number;
  name: string;
  raidName: string;
  bossName: string;
  /** What the game says of it, once an addon read it: who may equip it. */
  kind: ItemKind | undefined;
}

/** A soft reserve made with the character of a sign-up. */
export interface SoftReserve {
  itemId: number;
  characterId: string;
  characterName: string;
  characterClass: string;
}

export interface Reserver {
  characterId: string;
  characterName: string;
  characterClass: string;
  /** SR+ bonus added to the character's roll on this item. */
  bonus: number;
}

/** SR+: each previous raid where the character, present, reserved the item without getting it adds a step. */
export const SOFT_RESERVE_BONUS_STEP = 10;
export const SOFT_RESERVE_BONUS_CAP = 30;

/** What happened to a character, for one item, at a previous event. */
export interface PastEventForItem {
  /** One of the event's raids drops the item. */
  dropsItem: boolean;
  present: boolean;
  reserved: boolean;
  obtained: boolean;
}

/** Key of a character's reserve on an item, to find the past events of that reserve. */
export function reserveKey(characterId: string, itemId: number): string {
  return `${characterId}/${itemId}`;
}

/**
 * SR+ bonus of a character on an item it reserves again, from its previous events, newest first.
 * An absence, or an event without the item's raid, is neutral. Getting the item, or being present without
 * reserving it, ends the streak.
 */
export function softReserveBonus(pastEvents: readonly PastEventForItem[]): number {
  let bonus = 0;
  for (const event of pastEvents) {
    if (!event.dropsItem || !event.present) {
      continue;
    }
    if (event.obtained || !event.reserved) {
      break;
    }
    bonus += SOFT_RESERVE_BONUS_STEP;
  }
  return Math.min(bonus, SOFT_RESERVE_BONUS_CAP);
}

/** Members can no longer change their soft reserves this long before the raid; officers still can. */
export const SOFT_RESERVE_LOCK_BEFORE_START_MS = 30 * 60 * 1000;

export function softReservesLockAt(eventStartsAt: Date): Date {
  return new Date(eventStartsAt.getTime() - SOFT_RESERVE_LOCK_BEFORE_START_MS);
}

/** Computed from the clock rather than stored: no scheduled job is needed to lock. */
export function areSoftReservesLocked(eventStartsAt: Date, now: Date): boolean {
  return now.getTime() >= softReservesLockAt(eventStartsAt).getTime();
}

export interface BoardItem extends LootItem {
  reservedBy: Reserver[];
  /** Signed-up characters who already received this item in an earlier raid. */
  alreadyOwnedBy: number;
  excluded: boolean;
  mine: boolean;
}

export type SoftReserveCheck = { valid: true; itemIds: number[] } | { valid: false; refusal: string };

function refuse(refusal: string): SoftReserveCheck {
  return { valid: false, refusal };
}

/**
 * Validates the item ids chosen in a form for a character: known loot of the event, not excluded, that its class
 * may equip, within the allowance.
 */
export function checkSoftReserveChoice(
  rawItemIds: readonly string[],
  context: {
    allowance: number;
    loot: readonly LootItem[];
    excludedItemIds: ReadonlySet<number>;
    characterClass: string;
  },
): SoftReserveCheck {
  const itemIds = [...new Set(rawItemIds.map(Number))];
  const byId = new Map(context.loot.map((item) => [item.itemId, item]));
  const chosen = itemIds.map((itemId) => byId.get(itemId));
  if (chosen.some((item) => item === undefined)) {
    return refuse("Un des objets choisis ne tombe pas dans les raids de cet événement.");
  }
  if (itemIds.some((itemId) => context.excludedItemIds.has(itemId))) {
    return refuse("Un des objets choisis a été exclu des SR par les officiers.");
  }
  const unfit = chosen.find((item) => item !== undefined && !canEquip(context.characterClass, item.kind));
  if (unfit !== undefined) {
    return refuse(`Un ${classLabel(context.characterClass).toLowerCase()} ne peut pas équiper « ${unfit.name} ».`);
  }
  if (itemIds.length > context.allowance) {
    return refuse(`Vous avez droit à ${context.allowance} SR au plus.`);
  }
  return { valid: true, itemIds };
}

export interface BoardFacts {
  loot: readonly LootItem[];
  reserves: readonly SoftReserve[];
  excludedItemIds: ReadonlySet<number>;
  ownersByItem: ReadonlyMap<number, number>;
  /** Previous events of each reserve, by reserveKey, newest first. */
  pastEventsByReserve: ReadonlyMap<string, readonly PastEventForItem[]>;
  myCharacterId: string | undefined;
}

/** Every lootable item of the event with its reservers and their SR+ bonus, as shown to the guild. */
export function buildBoard({
  loot,
  reserves,
  excludedItemIds,
  ownersByItem,
  pastEventsByReserve,
  myCharacterId,
}: BoardFacts): BoardItem[] {
  return loot.map((item) => {
    const onItem = reserves.filter((reserve) => reserve.itemId === item.itemId);
    return {
      ...item,
      reservedBy: onItem.map(({ characterId, characterName, characterClass }) => ({
        characterId,
        characterName,
        characterClass,
        bonus: softReserveBonus(pastEventsByReserve.get(reserveKey(characterId, item.itemId)) ?? []),
      })),
      alreadyOwnedBy: ownersByItem.get(item.itemId) ?? 0,
      excluded: excludedItemIds.has(item.itemId),
      mine: onItem.some((reserve) => reserve.characterId === myCharacterId),
    };
  });
}
