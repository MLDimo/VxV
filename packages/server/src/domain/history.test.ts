import { describe, expect, it } from "vitest";
import { softReserveRespected, type SoftReservedLoot } from "./history.ts";

const loot: SoftReservedLoot = {
  eventId: "e",
  eventStartsAt: new Date(),
  raids: ["Onyxia"],
  bossName: "Onyxia",
  itemName: "Tête d'Onyxia",
  winnerName: "Ðéjà Vu",
  winnerClass: "ROGUE",
  lootedAt: new Date(),
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
