import { describe, expect, it } from "vitest";
import { tavernPicture } from "./tavernPicture";

describe("the tavern's picture", () => {
  it("is dressed up for the WoW holiday of the day in France, else the tavern of every day", () => {
    expect(tavernPicture(new Date("2026-10-09T12:00:00Z"))).toBe("/images/taverne.jpg");
    // 17 October at 23:30 in Paris is already the 18th: Sanssaint has begun.
    expect(tavernPicture(new Date("2026-10-17T22:30:00Z"))).toBe("/images/tavernes/sanssaint.jpg");
    expect(tavernPicture(new Date("2026-12-24T20:00:00Z"))).toBe("/images/tavernes/voile-d-hiver.jpg");
  });
});
