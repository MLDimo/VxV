import { describe, expect, it } from "vitest";
import { softReserveRespected, type LootRecord } from "./history.ts";

const loot: LootRecord = {
  eventId: "e",
  eventStartsAt: new Date(),
  raids: ["Onyxia"],
  bossName: "Onyxia",
  itemName: "Tête d'Onyxia",
  winnerName: "Ðéjà Vu",
  winnerClass: "ROGUE",
  lootedAt: new Date(),
  method: "soft_reserve",
  softReservedBy: ["Eole Hermes", "Ðéjà Vu"],
};

describe("softReserveRespected", () => {
  it("is respected when a reserving character won the item", () => {
    expect(softReserveRespected(loot)).toBe(true);
  });

  it("is not respected when somebody else won it", () => {
    expect(softReserveRespected({ ...loot, winnerName: "Ugly Hole" })).toBe(false);
  });
});
