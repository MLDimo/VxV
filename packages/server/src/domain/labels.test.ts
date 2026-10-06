import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatGold,
  formatOdds,
  formatPlace,
  formatRemaining,
  formatShare,
  formatShortEventDate,
  formatSignedGold,
} from "./labels.ts";

/** French typography keeps numbers and units together with no-break spaces. */
const plain = (text: string) => text.replace(/\s/gu, " ");

describe("labels", () => {
  it("writes a raid night's short date in the guild's time zone, for a card", () => {
    expect(formatShortEventDate(new Date("2026-12-10T20:00:00Z"))).toBe("Jeu. 10 déc. · 21h00");
    expect(formatShortEventDate(new Date("2026-10-08T19:00:00Z"))).toBe("Jeu. 8 oct. · 21h00");
  });

  it("writes gold with the French thousands separator, odds with two decimals, shares as percentages", () => {
    expect(plain(formatGold(1000))).toBe("1 000 po");
    expect(plain(formatGold(7))).toBe("7 po");
    expect(plain(formatOdds(4.5))).toBe("× 4,50");
    expect(plain(formatOdds(2.142857))).toBe("× 2,14");
    expect(formatOdds(undefined)).toBe("—");
    expect(plain(formatShare(0.42))).toBe("42 %");
    expect(plain(formatSignedGold(500))).toBe("+500 po");
    expect(plain(formatSignedGold(-850))).toBe("−850 po");
  });

  it("writes what remains in days and hours, else in hours and minutes", () => {
    const hour = 60 * 60 * 1000;
    expect(formatRemaining(76 * hour + 30 * 60 * 1000)).toBe("3 j 4 h");
    expect(formatRemaining(5 * hour + 12 * 60 * 1000)).toBe("5 h 12");
    expect(formatRemaining(-hour)).toBe("0 min");
  });

  it("writes a place in a ranking", () => {
    expect([1, 2, 3].map(formatPlace)).toEqual(["1er", "2e", "3e"]);
  });

  it("writes a duration in hours and minutes, or minutes alone", () => {
    expect(formatDuration(72 * 60 * 1000)).toBe("1 h 12");
    expect(formatDuration(65 * 60 * 1000)).toBe("1 h 05");
    expect(formatDuration(45 * 60 * 1000)).toBe("45 min");
  });
});
