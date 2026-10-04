/** How an item was given: soft reserve, soft reserve with its bonus, free roll or loot council. */
export const LOOT_METHODS = ["soft_reserve", "soft_reserve_plus", "free_roll", "loot_council"] as const;

export type LootMethod = (typeof LOOT_METHODS)[number];

/** Methods that give the item to a character who soft-reserved it: the "SR only" filter of the history. */
export const SOFT_RESERVE_METHODS: readonly LootMethod[] = ["soft_reserve", "soft_reserve_plus"];

/** A loot of a past raid, with how it was given and who had soft-reserved the item for that event. */
export interface LootRecord {
  id: string;
  eventId: string;
  eventStartsAt: Date;
  raids: string[];
  bossName: string;
  itemName: string;
  winnerName: string;
  winnerClass: string;
  lootedAt: Date;
  method: LootMethod;
  /** Characters who had soft-reserved the item for this event, possibly none. */
  softReservedBy: string[];
}

/** A loot given by soft reserve respects it when the item went to one of the characters who reserved it. */
export function softReserveRespected(loot: LootRecord): boolean {
  return loot.softReservedBy.includes(loot.winnerName);
}
