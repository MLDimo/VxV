import { describe, expect, it } from "vitest";
import { newEventRefusal, type NewRaidEvent } from "./events.ts";

const now = new Date("2026-12-01T12:00:00Z");
const raids = new Set(["onyxia", "mont-hyjal"]);
const valid: NewRaidEvent = {
  startsAt: new Date("2026-12-10T20:00:00Z"),
  raidIds: ["onyxia", "mont-hyjal"],
  softReservesPerPlayer: 1,
  roleId: "raider-1",
};

describe("newEventRefusal", () => {
  it("accepts a future event on known raids", () => {
    expect(newEventRefusal(valid, now, raids)).toBeUndefined();
  });

  it.each([
    ["an invalid date", { startsAt: new Date("invalid") }, /invalides/],
    ["a date in the past", { startsAt: new Date("2026-11-30T20:00:00Z") }, /dans le futur/],
    ["the current instant", { startsAt: now }, /dans le futur/],
    ["no raid", { raidIds: [] }, /au moins un raid/],
    ["an unknown raid", { raidIds: ["onyxia", "naxxramas"] }, /n'existe pas/],
    ["zero soft reserve", { softReservesPerPlayer: 0 }, /entre 1 et 10/],
    ["too many soft reserves", { softReservesPerPlayer: 11 }, /entre 1 et 10/],
    ["a fractional count", { softReservesPerPlayer: 1.5 }, /entre 1 et 10/],
  ])("refuses %s", (_case, change, message) => {
    expect(newEventRefusal({ ...valid, ...change }, now, raids)).toMatch(message);
  });
});
