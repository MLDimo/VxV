import { describe, expect, it } from "vitest";
import { formatDuration, formatShortEventDate } from "./labels.ts";

describe("labels", () => {
  it("writes a raid night's short date in the guild's time zone, for a card", () => {
    expect(formatShortEventDate(new Date("2026-12-10T20:00:00Z"))).toBe("Jeu. 10 déc. · 21h00");
    expect(formatShortEventDate(new Date("2026-10-08T19:00:00Z"))).toBe("Jeu. 8 oct. · 21h00");
  });

  it("writes a duration in hours and minutes, or minutes alone", () => {
    expect(formatDuration(72 * 60 * 1000)).toBe("1 h 12");
    expect(formatDuration(65 * 60 * 1000)).toBe("1 h 05");
    expect(formatDuration(45 * 60 * 1000)).toBe("45 min");
  });
});
