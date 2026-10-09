import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADDON_SEASON_YEARS, easter, parisDay, seasonOn, SEASONS } from "./seasons.ts";

const SITE_PICTURES = new URL("../../../apps/web/public/images/tavernes/", import.meta.url);
const ADDON_PICTURES = new URL("../../../addon/VXV_Core/Media/Tavernes/", import.meta.url);
const DAY_MS = 24 * 60 * 60 * 1000;

describe("the tavern's holidays", () => {
  it("finds Easter Sunday", () => {
    expect([2024, 2025, 2026, 2027].map((year) => easter(year).toISOString().slice(0, 10))).toEqual([
      "2024-03-31",
      "2025-04-20",
      "2026-04-05",
      "2027-03-28",
    ]);
  });

  it("dresses the tavern up from a holiday's first day to its last, across the new year too", () => {
    const on = (day: string) => seasonOn(day)?.id;
    expect(on("2026-10-09")).toBeUndefined();
    expect([on("2026-10-17"), on("2026-10-18"), on("2026-11-01"), on("2026-11-02")]).toEqual([
      undefined,
      "sanssaint",
      "sanssaint",
      undefined,
    ]);
    expect([on("2026-12-15"), on("2026-12-31"), on("2027-01-02"), on("2027-01-03")]).toEqual([
      "voile-d-hiver",
      "voile-d-hiver",
      "voile-d-hiver",
      undefined,
    ]);
    // The Jardin des nobles is Easter's week.
    expect([on("2027-03-27"), on("2027-03-28"), on("2027-04-03"), on("2027-04-04")]).toEqual([
      undefined,
      "jardin-des-nobles",
      "jardin-des-nobles",
      undefined,
    ]);
    expect([on("2026-02-14"), on("2026-06-21"), on("2026-09-20")]).toEqual(["amour", "solstice", "brasseurs"]);
  });

  it("counts the days in France", () => {
    expect(parisDay(new Date("2026-10-17T22:30:00Z"))).toBe("2026-10-18");
    expect(parisDay(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("never dresses up for two holidays on the same day, over the years the addon knows", () => {
    const first = Date.UTC(ADDON_SEASON_YEARS.first, 0, 1);
    const last = Date.UTC(ADDON_SEASON_YEARS.last, 11, 31);
    for (let time = first; time <= last; time += DAY_MS) {
      const day = new Date(time).toISOString().slice(0, 10);
      const seasons = SEASONS.filter((season) =>
        [Number(day.slice(0, 4)) - 1, Number(day.slice(0, 4))].some((year) => {
          const [from, to] = season.days(year);
          return from <= day && day <= to;
        }),
      );
      expect(seasons.length, day).toBeLessThanOrEqual(1);
    }
  });

  it("has each holiday's tavern, for the website and for the addon", () => {
    for (const season of SEASONS) {
      expect(existsSync(new URL(`${season.id}.jpg`, SITE_PICTURES)), season.id).toBe(true);
      expect(existsSync(new URL(`${season.id}.png`, ADDON_PICTURES)), season.id).toBe(true);
    }
  });
});
