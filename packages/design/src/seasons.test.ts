import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADDON_SEASON_YEARS, easter, parisDay, seasonOn, SEASONS } from "./seasons.ts";

const SITE_PICTURES = new URL("../../../apps/web/public/images/tavernes/", import.meta.url);
const ADDON_PICTURES = new URL("../../../addon/VXV/Core/Media/Tavernes/", import.meta.url);
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
    expect(on("2026-10-13")).toBeUndefined();
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

  it("never dresses up for two yearly holidays on the same day, over the years the addon knows", () => {
    const yearly = SEASONS.filter((season) => season.id !== "sombrelune");
    const first = Date.UTC(ADDON_SEASON_YEARS.first, 0, 1);
    const last = Date.UTC(ADDON_SEASON_YEARS.last, 11, 31);
    for (let time = first; time <= last; time += DAY_MS) {
      const day = new Date(time).toISOString().slice(0, 10);
      const seasons = yearly.filter((season) =>
        [Number(day.slice(0, 4)) - 1, Number(day.slice(0, 4))].some((year) =>
          season.periods(year).some(([from, to]) => from <= day && day <= to),
        ),
      );
      expect(seasons.length, day).toBeLessThanOrEqual(1);
    }
  });

  it("holds the Darkmoon Faire from the Monday after each month's first Friday to the Sunday, after the other holidays", () => {
    const on = (day: string) => seasonOn(day)?.id;
    // November 2026: set up on Friday the 6th, open from Monday the 9th to Sunday the 15th.
    expect([on("2026-11-04"), on("2026-11-08"), on("2026-11-09"), on("2026-11-15"), on("2026-11-16")]).toEqual([
      undefined,
      undefined,
      "sombrelune",
      "sombrelune",
      undefined,
    ]);
    // December 2026: from Monday the 7th to Sunday the 13th.
    expect([on("2026-12-06"), on("2026-12-07"), on("2026-12-13"), on("2026-12-14")]).toEqual([
      undefined,
      "sombrelune",
      "sombrelune",
      undefined,
    ]);
    // A month starting on a Friday: January 2027, from Monday the 4th.
    expect([on("2027-01-03"), on("2027-01-04"), on("2027-01-10")]).toEqual([undefined, "sombrelune", "sombrelune"]);
    // October 2026 (Friday the 2nd): Brewfest until Tuesday the 6th, then the faire's last days.
    expect([on("2026-10-05"), on("2026-10-07"), on("2026-10-11"), on("2026-10-12")]).toEqual([
      "brasseurs",
      "sombrelune",
      "sombrelune",
      undefined,
    ]);
  });

  it("has each holiday's tavern, for the website and for the addon", () => {
    for (const season of SEASONS) {
      expect(existsSync(new URL(`${season.id}.jpg`, SITE_PICTURES)), season.id).toBe(true);
      expect(existsSync(new URL(`${season.id}.png`, ADDON_PICTURES)), season.id).toBe(true);
    }
  });
});
