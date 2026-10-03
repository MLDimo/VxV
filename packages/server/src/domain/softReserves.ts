/** An item that a boss of the event's raids can drop. */
export interface LootItem {
  itemId: number;
  name: string;
  raidName: string;
  bossName: string;
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

/** Validates the item ids chosen in a form: known loot of the event, not excluded, within the allowance. */
export function checkSoftReserveChoice(
  rawItemIds: readonly string[],
  context: { allowance: number; lootItemIds: ReadonlySet<number>; excludedItemIds: ReadonlySet<number> },
): SoftReserveCheck {
  const itemIds = [...new Set(rawItemIds.map(Number))];
  if (itemIds.some((itemId) => !context.lootItemIds.has(itemId))) {
    return refuse("Un des objets choisis ne tombe pas dans les raids de cet événement.");
  }
  if (itemIds.some((itemId) => context.excludedItemIds.has(itemId))) {
    return refuse("Un des objets choisis a été exclu des SR par les officiers.");
  }
  if (itemIds.length > context.allowance) {
    return refuse(`Vous avez droit à ${context.allowance} SR au plus.`);
  }
  return { valid: true, itemIds };
}

/** Every lootable item of the event with its reservers, as shown to the guild. */
export function buildBoard(
  loot: readonly LootItem[],
  reserves: readonly SoftReserve[],
  excludedItemIds: ReadonlySet<number>,
  ownersByItem: ReadonlyMap<number, number>,
  myCharacterId: string | undefined,
): BoardItem[] {
  return loot.map((item) => {
    const onItem = reserves.filter((reserve) => reserve.itemId === item.itemId);
    return {
      ...item,
      reservedBy: onItem.map(({ characterId, characterName, characterClass }) => ({
        characterId,
        characterName,
        characterClass,
      })),
      alreadyOwnedBy: ownersByItem.get(item.itemId) ?? 0,
      excluded: excludedItemIds.has(item.itemId),
      mine: onItem.some((reserve) => reserve.characterId === myCharacterId),
    };
  });
}
