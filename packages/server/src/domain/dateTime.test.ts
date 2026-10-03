import { describe, expect, it } from "vitest";
import { wallClockToInstant } from "./dateTime.ts";

describe("wallClockToInstant", () => {
  it.each([
    ["winter time (UTC+1)", "2026-12-10T21:00", "2026-12-10T20:00:00.000Z"],
    ["summer time (UTC+2)", "2027-07-10T21:00", "2027-07-10T19:00:00.000Z"],
    ["the evening the clocks go back", "2026-10-25T21:00", "2026-10-25T20:00:00.000Z"],
    ["the evening the clocks go forward", "2027-03-28T21:00", "2027-03-28T19:00:00.000Z"],
    ["midnight", "2026-12-31T00:00", "2026-12-30T23:00:00.000Z"],
  ])("reads Paris %s", (_case, wallClock, instant) => {
    expect(wallClockToInstant(wallClock).toISOString()).toBe(instant);
  });

  it.each(["", "2026-12-10", "10/12/2026 21:00", "2026-12-10T21:00:00"])("gives an invalid date for %j", (input) => {
    expect(Number.isNaN(wallClockToInstant(input).getTime())).toBe(true);
  });
});
