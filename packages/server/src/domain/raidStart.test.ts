import { describe, expect, it } from "vitest";
import { parseRaidStart } from "./raidStart.ts";

const now = new Date("2026-10-03T12:00:00Z");

describe("parseRaidStart", () => {
  it("reads a full date and time in the guild's time zone (Paris)", () => {
    expect(parseRaidStart("12/12/2026", "21:00", now)).toEqual(new Date("2026-12-12T20:00:00Z"));
    expect(parseRaidStart("12/07/2027", "21h30", now)).toEqual(new Date("2027-07-12T19:30:00Z"));
    expect(parseRaidStart("5/1/2027", "21h", now)).toEqual(new Date("2027-01-05T20:00:00Z"));
  });

  it("takes the next such day when the year is left out", () => {
    expect(parseRaidStart("12/12", "21:00", now)).toEqual(new Date("2026-12-12T20:00:00Z"));
    expect(parseRaidStart("01/02", "21:00", now)).toEqual(new Date("2027-02-01T20:00:00Z"));
  });

  it.each([
    ["31/02/2027", "21:00"],
    ["12/13/2026", "21:00"],
    ["12/12/2026", "25:00"],
    ["12/12/2026", "21:75"],
    ["demain", "21:00"],
    ["12/12/2026", "le soir"],
  ])("refuses %s at %s", (date, time) => {
    expect(parseRaidStart(date, time, now)).toBeUndefined();
  });
});
