import { describe, expect, it } from "vitest";
import {
  areSoftReservesLocked,
  buildBoard,
  checkSoftReserveChoice,
  reserveKey,
  softReserveBonus,
  softReservesLockAt,
  type LootItem,
  type PastEventForItem,
  type SoftReserve,
} from "./softReserves.ts";

const LEATHER = { itemClass: 4, itemSubclass: 2, equipSlot: "INVTYPE_LEGS" };
const lootItem = (itemId: number, name: string, kind?: LootItem["kind"]): LootItem => ({
  itemId,
  name,
  raidName: "Thanes",
  bossName: "Durgen",
  kind,
});
const context = {
  allowance: 2,
  loot: [lootItem(1, "Croc de Magmatus"), lootItem(2, "Jambières de Dirgehammer", LEATHER), lootItem(3, "Cape")],
  excludedItemIds: new Set([3]),
  characterClass: "ROGUE",
};

function refusalOf(itemIds: string[], allowance = 2, characterClass = "ROGUE"): string | undefined {
  const check = checkSoftReserveChoice(itemIds, { ...context, allowance, characterClass });
  return check.valid ? undefined : check.refusal;
}

describe("checkSoftReserveChoice", () => {
  it("accepts loot of the event within the allowance, without duplicates", () => {
    expect(checkSoftReserveChoice(["1", "2", "1"], context)).toEqual({ valid: true, itemIds: [1, 2] });
    expect(checkSoftReserveChoice([], context)).toEqual({ valid: true, itemIds: [] });
  });

  it.each([
    ["an item outside the event's loot", ["9"], /ne tombe pas/],
    ["a malformed item id", ["abc"], /ne tombe pas/],
    ["an excluded item", ["3"], /exclu/],
  ])("refuses %s", (_case, itemIds, message) => {
    expect(refusalOf(itemIds)).toMatch(message);
  });

  it("refuses more items than the allowance", () => {
    expect(refusalOf(["1", "2"], 1)).toBe("Vous avez droit à 1 SR au plus.");
  });

  it("refuses an item the character's class may not equip", () => {
    expect(refusalOf(["2"], 2, "PRIEST")).toBe("Un prêtre ne peut pas équiper « Jambières de Dirgehammer ».");
    expect(refusalOf(["1"], 2, "PRIEST")).toBeUndefined();
  });
});

/** Present at a previous raid with the item, reserved it and did not get it. */
const MISSED: PastEventForItem = { dropsItem: true, present: true, reserved: true, obtained: false };

describe("buildBoard", () => {
  const loot: LootItem[] = [
    { itemId: 1, name: "Croc de Magmatus", raidName: "Thanes", bossName: "Infurnus", kind: undefined },
    { itemId: 2, name: "Brassards brindecieux", raidName: "Thanes", bossName: "Faldrim", kind: undefined },
  ];
  const reserve = (itemId: number, characterId: string, characterName: string): SoftReserve => ({
    itemId,
    characterId,
    characterName,
    characterClass: "ROGUE",
  });

  it("shows reservers with their SR+ bonus, owners, exclusions and the viewer's own choices", () => {
    const board = buildBoard({
      loot,
      reserves: [reserve(1, "me", "Ðéjà Vu"), reserve(1, "other", "Eole Hermes")],
      excludedItemIds: new Set([2]),
      ownersByItem: new Map([[1, 3]]),
      pastEventsByReserve: new Map([[reserveKey("other", 1), [MISSED]]]),
      myCharacterId: "me",
    });
    expect(board).toEqual([
      {
        ...loot[0],
        reservedBy: [
          { characterId: "me", characterName: "Ðéjà Vu", characterClass: "ROGUE", bonus: 0 },
          { characterId: "other", characterName: "Eole Hermes", characterClass: "ROGUE", bonus: 10 },
        ],
        alreadyOwnedBy: 3,
        excluded: false,
        mine: true,
      },
      { ...loot[1], reservedBy: [], alreadyOwnedBy: 0, excluded: true, mine: false },
    ]);
  });
});

describe("softReserveBonus", () => {
  const ABSENT: PastEventForItem = { dropsItem: true, present: false, reserved: false, obtained: false };
  const OTHER_RAID: PastEventForItem = { dropsItem: false, present: true, reserved: false, obtained: false };
  const OBTAINED: PastEventForItem = { dropsItem: true, present: true, reserved: true, obtained: true };
  const NOT_RESERVED: PastEventForItem = { dropsItem: true, present: true, reserved: false, obtained: false };

  it.each<[string, PastEventForItem[], number]>([
    ["no previous event", [], 0],
    ["one reserve not obtained", [MISSED], 10],
    ["three in a row", [MISSED, MISSED, MISSED], 30],
    ["capped at +30", Array<PastEventForItem>(7).fill(MISSED), 30],
    ["an absence is neutral", [MISSED, ABSENT, MISSED], 20],
    ["an event without the item's raid is neutral", [MISSED, OTHER_RAID, MISSED], 20],
    ["getting the item ends the streak", [MISSED, OBTAINED, MISSED], 10],
    ["being present without reserving ends the streak", [MISSED, NOT_RESERVED, MISSED], 10],
    ["nothing after getting the item at the last raid", [OBTAINED, MISSED], 0],
  ])("%s: +%i", (_, pastEvents, bonus) => {
    expect(softReserveBonus(pastEvents)).toBe(bonus);
  });
});

describe("soft reserve lock", () => {
  const startsAt = new Date("2026-12-10T20:00:00Z");

  it("locks 30 minutes before the raid", () => {
    expect(softReservesLockAt(startsAt)).toEqual(new Date("2026-12-10T19:30:00Z"));
    expect(areSoftReservesLocked(startsAt, new Date("2026-12-10T19:29:59Z"))).toBe(false);
    expect(areSoftReservesLocked(startsAt, new Date("2026-12-10T19:30:00Z"))).toBe(true);
    expect(areSoftReservesLocked(startsAt, new Date("2026-12-10T21:00:00Z"))).toBe(true);
  });
});
