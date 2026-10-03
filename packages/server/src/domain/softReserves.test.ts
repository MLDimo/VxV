import { describe, expect, it } from "vitest";
import { buildBoard, checkSoftReserveChoice, type LootItem, type SoftReserve } from "./softReserves.ts";

const context = { allowance: 2, lootItemIds: new Set([1, 2, 3]), excludedItemIds: new Set([3]) };

function refusalOf(itemIds: string[], allowance = 2): string | undefined {
  const check = checkSoftReserveChoice(itemIds, { ...context, allowance });
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
});

describe("buildBoard", () => {
  const loot: LootItem[] = [
    { itemId: 1, name: "Croc de Magmatus", raidName: "Thanes", bossName: "Infurnus" },
    { itemId: 2, name: "Brassards brindecieux", raidName: "Thanes", bossName: "Faldrim" },
  ];
  const reserve = (itemId: number, characterId: string, characterName: string): SoftReserve => ({
    itemId,
    characterId,
    characterName,
    characterClass: "ROGUE",
  });

  it("shows reservers, owners, exclusions and the viewer's own choices", () => {
    const board = buildBoard(
      loot,
      [reserve(1, "me", "Ðéjà Vu"), reserve(1, "other", "Eole Hermes")],
      new Set([2]),
      new Map([[1, 3]]),
      "me",
    );
    expect(board).toEqual([
      {
        ...loot[0],
        reservedBy: [
          { characterName: "Ðéjà Vu", characterClass: "ROGUE" },
          { characterName: "Eole Hermes", characterClass: "ROGUE" },
        ],
        alreadyOwnedBy: 3,
        excluded: false,
        mine: true,
      },
      { ...loot[1], reservedBy: [], alreadyOwnedBy: 0, excluded: true, mine: false },
    ]);
  });
});
