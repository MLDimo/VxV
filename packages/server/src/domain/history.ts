/** A loot of a past raid on an item that somebody had soft-reserved for that event. */
export interface SoftReservedLoot {
  eventId: string;
  eventStartsAt: Date;
  raids: string[];
  bossName: string;
  itemName: string;
  winnerName: string;
  winnerClass: string;
  lootedAt: Date;
  /** Characters who had soft-reserved the item for this event. */
  softReservedBy: string[];
}

/** The soft reserve was respected when the item went to one of the characters who reserved it. */
export function softReserveRespected(loot: SoftReservedLoot): boolean {
  return loot.softReservedBy.includes(loot.winnerName);
}
