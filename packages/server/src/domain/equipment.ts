/**
 * Who may equip an item (owner's decision of 10 October): what the game says of it (its class, subclass and slot,
 * read in game by the addon) and the classes' proficiencies of WoW Classic at level 60. An item nobody read yet, or
 * one the rules do not restrict (a ring, a cloak, a token), suits every class.
 */

/** What the game says of an item (C_Item.GetItemInfo): its class, its subclass and the slot it goes in. */
export interface ItemKind {
  itemClass: number;
  itemSubclass: number;
  /** The game's equip slot ("INVTYPE_WRIST"…), empty for an item one does not wear. */
  equipSlot: string;
}

const WEAPON = 2;
const ARMOR = 4;
/** A cloak is cloth by its subclass, worn by every class. */
const CLOAK_SLOT = "INVTYPE_CLOAK";

const LEATHER_WEARERS = ["WARRIOR", "PALADIN", "HUNTER", "ROGUE", "SHAMAN", "DRUID"] as const;
const MAIL_WEARERS = ["WARRIOR", "PALADIN", "HUNTER", "SHAMAN"] as const;
const AXE_WIELDERS = ["WARRIOR", "PALADIN", "HUNTER", "SHAMAN"] as const;
const SHOOTERS = ["WARRIOR", "HUNTER", "ROGUE"] as const;
const POLEARM_WIELDERS = ["WARRIOR", "PALADIN", "HUNTER"] as const;

/** The game's armor subclasses that only some classes wear (cloth and the others: every class). */
const ARMORS: Readonly<Record<number, readonly string[]>> = {
  2: LEATHER_WEARERS,
  3: MAIL_WEARERS,
  4: ["WARRIOR", "PALADIN"],
  6: ["WARRIOR", "PALADIN", "SHAMAN"],
  7: ["PALADIN"],
  8: ["DRUID"],
  9: ["SHAMAN"],
};

/** The game's weapon subclasses and the classes that wield them (the others: every class). */
const WEAPONS: Readonly<Record<number, readonly string[]>> = {
  0: AXE_WIELDERS,
  1: AXE_WIELDERS,
  2: SHOOTERS,
  3: SHOOTERS,
  4: ["WARRIOR", "PALADIN", "ROGUE", "PRIEST", "SHAMAN", "DRUID"],
  5: ["WARRIOR", "PALADIN", "SHAMAN", "DRUID"],
  6: POLEARM_WIELDERS,
  7: ["WARRIOR", "PALADIN", "HUNTER", "ROGUE", "MAGE", "WARLOCK"],
  8: POLEARM_WIELDERS,
  10: ["WARRIOR", "HUNTER", "PRIEST", "SHAMAN", "MAGE", "WARLOCK", "DRUID"],
  13: ["WARRIOR", "HUNTER", "ROGUE", "SHAMAN", "DRUID"],
  15: ["WARRIOR", "HUNTER", "ROGUE", "PRIEST", "SHAMAN", "MAGE", "WARLOCK", "DRUID"],
  16: SHOOTERS,
  18: SHOOTERS,
  19: ["PRIEST", "MAGE", "WARLOCK"],
};

/** The classes that may equip the item, or undefined when every class may. */
export function equipClasses(kind: ItemKind | undefined): readonly string[] | undefined {
  if (kind?.itemClass === WEAPON) {
    return WEAPONS[kind.itemSubclass];
  }
  if (kind?.itemClass === ARMOR && kind.equipSlot !== CLOAK_SLOT) {
    return ARMORS[kind.itemSubclass];
  }
  return undefined;
}

/** Whether a character of this class may equip the item; a character whose class is unknown may. */
export function canEquip(characterClass: string | undefined, kind: ItemKind | undefined): boolean {
  const classes = equipClasses(kind);
  return characterClass === undefined || classes === undefined || classes.includes(characterClass);
}
