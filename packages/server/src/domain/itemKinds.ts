import type { ItemKind } from "./equipment.ts";
import { readRecords, wholeNumber } from "./textFormat.ts";

/** First line of the raids' items as the addon reads them in game (contract with VXV/Raid); the version follows. */
export const ITEM_KINDS_HEADER = "VXV-OBJETS-1";
/** The game's equip slots ("INVTYPE_WRIST", "INVTYPE_2HWEAPON"): capitals, digits and underscores. */
const EQUIP_SLOT = /^[A-Z0-9_]*$/;

/** An item of the raids and what the game says of it. */
export interface ItemKindReading extends ItemKind {
  itemId: number;
}

/**
 * The raids' items as the addon reads them in game, one line per item:
 * I;item id;class;subclass;equip slot (empty for an item one does not wear)
 * Lines of an unknown kind are skipped.
 */
export function parseItemKinds(text: string): ItemKindReading[] {
  const readings: ItemKindReading[] = [];
  readRecords(text, {
    header: ITEM_KINDS_HEADER,
    wrongHeader: `Les objets des raids doivent commencer par la ligne ${ITEM_KINDS_HEADER}.`,
    readers: {
      I: ([id, itemClass, itemSubclass, equipSlot = ""]) => {
        const itemId = wholeNumber(id);
        const kind = { itemClass: wholeNumber(itemClass), itemSubclass: wholeNumber(itemSubclass) };
        if (
          itemId === undefined ||
          itemId === 0 ||
          kind.itemClass === undefined ||
          kind.itemSubclass === undefined ||
          !EQUIP_SLOT.test(equipSlot)
        ) {
          return false;
        }
        readings.push({ itemId, itemClass: kind.itemClass, itemSubclass: kind.itemSubclass, equipSlot });
        return true;
      },
    },
  });
  return readings;
}
