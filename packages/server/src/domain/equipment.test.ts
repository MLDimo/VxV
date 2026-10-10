import { describe, expect, it } from "vitest";
import { canEquip, equipClasses, type ItemKind } from "./equipment.ts";

const armor = (itemSubclass: number, equipSlot = "INVTYPE_CHEST"): ItemKind => ({
  itemClass: 4,
  itemSubclass,
  equipSlot,
});
const weapon = (itemSubclass: number, equipSlot = "INVTYPE_WEAPON"): ItemKind => ({
  itemClass: 2,
  itemSubclass,
  equipSlot,
});

describe("who may equip an item (Classic, level 60)", () => {
  it("dresses each class in its armor and below: a priest in cloth only, a warrior in plate too", () => {
    for (const subclass of [2, 3, 4]) {
      expect(canEquip("PRIEST", armor(subclass))).toBe(false);
    }
    expect(canEquip("PRIEST", armor(1))).toBe(true);
    expect(canEquip("ROGUE", armor(2))).toBe(true);
    expect(canEquip("ROGUE", armor(3))).toBe(false);
    expect(canEquip("HUNTER", armor(3))).toBe(true);
    expect(canEquip("WARRIOR", armor(4))).toBe(true);
    expect(canEquip("WARRIOR", armor(1))).toBe(true);
  });

  it("arms each class with its weapons: no two-handed weapon for a rogue, a dagger for a mage", () => {
    for (const subclass of [1, 5, 6, 8, 10]) {
      expect(canEquip("ROGUE", weapon(subclass, "INVTYPE_2HWEAPON"))).toBe(false);
    }
    expect(canEquip("ROGUE", weapon(15))).toBe(true);
    expect(canEquip("MAGE", weapon(15))).toBe(true);
    expect(canEquip("PALADIN", weapon(15))).toBe(false);
    expect(canEquip("PRIEST", weapon(19, "INVTYPE_RANGEDRIGHT"))).toBe(true);
    expect(equipClasses(weapon(8, "INVTYPE_2HWEAPON"))).toEqual(["WARRIOR", "PALADIN", "HUNTER"]);
  });

  it("keeps shields and relics to their classes", () => {
    expect(equipClasses(armor(6, "INVTYPE_SHIELD"))).toEqual(["WARRIOR", "PALADIN", "SHAMAN"]);
    expect(equipClasses(armor(7, "INVTYPE_RELIC"))).toEqual(["PALADIN"]);
  });

  it("lets every class take a cloak, a ring, a token, an item not read yet, and a character of unknown class anything", () => {
    expect(equipClasses(armor(1, "INVTYPE_CLOAK"))).toBeUndefined();
    expect(equipClasses(armor(0, "INVTYPE_FINGER"))).toBeUndefined();
    expect(equipClasses({ itemClass: 15, itemSubclass: 0, equipSlot: "" })).toBeUndefined();
    expect(equipClasses(undefined)).toBeUndefined();
    expect(canEquip(undefined, armor(4))).toBe(true);
  });
});
