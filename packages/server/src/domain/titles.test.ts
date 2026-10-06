import { describe, expect, it } from "vitest";
import { ahead, awardTitles, titleWeek, type TitleFacts } from "./titles.ts";

const at = (day: number, hour = 20) => new Date(Date.UTC(2026, 9, day, hour));
const NOTHING: TitleFacts = {
  bets: [],
  lastMissionWinner: undefined,
  loots: [],
  deaths: [],
  damage: [],
  healing: [],
  raised: [],
  donations: [],
};

describe("titles", () => {
  it("gives each title to the member ahead on its rule over the season", () => {
    const awards = awardTitles({
      bets: [
        { memberId: "vorn", amount: 100, gain: 450, endedAt: at(2) },
        { memberId: "vorn", amount: 50, gain: 0, endedAt: at(3) },
        { memberId: "morgane", amount: 150, gain: 0, endedAt: at(3) },
        { memberId: "thessa", amount: 200, gain: 260, endedAt: at(4) },
      ],
      lastMissionWinner: { memberId: "sira", at: at(5) },
      loots: [
        { memberId: "vorn", at: at(2) },
        { memberId: "kaelys", at: at(2) },
        { memberId: "kaelys", at: at(3) },
      ],
      deaths: [
        { memberId: "vorn", amount: 3, at: at(2) },
        { memberId: "vorn", amount: 2, at: at(9) },
        { memberId: "ulric", amount: 4, at: at(2) },
      ],
      damage: [
        { memberId: "ulric", amount: 182000, at: at(2) },
        { memberId: "kaelys", amount: 96000, at: at(2) },
        { memberId: "kaelys", amount: 110000, at: at(9) },
      ],
      healing: [
        { memberId: "sira", amount: 240000, at: at(2) },
        { memberId: "ulric", amount: 0, at: at(2) },
      ],
      raised: [{ memberId: "vorn", amount: 2, at: at(9) }],
      donations: [
        { memberId: "vorn", amount: 500, at: at(6) },
        { memberId: "brann", amount: 300, at: at(4) },
      ],
    });
    expect(awards).toEqual([
      { titleId: "gamblingKing", memberId: "vorn", score: 300 },
      { titleId: "debtKing", memberId: "morgane", score: 150 },
      { titleId: "numberOne", memberId: "sira", score: 1 },
      { titleId: "wellFed", memberId: "kaelys", score: 2 },
      { titleId: "floorTaster", memberId: "vorn", score: 5 },
      { titleId: "topDamage", memberId: "kaelys", score: 206000 },
      { titleId: "topHealing", memberId: "sira", score: 240000 },
      { titleId: "mostRaised", memberId: "vorn", score: 2 },
      { titleId: "sugarDaddy", memberId: "vorn", score: 500 },
    ]);
  });

  it("gives a title nobody scored on to nobody: no winner without a gain, no debt king without a loss", () => {
    expect(awardTitles(NOTHING)).toEqual([]);
    expect(
      awardTitles({ ...NOTHING, bets: [{ memberId: "vorn", amount: 10, gain: 30, endedAt: at(2) }] }).map(
        (award) => award.titleId,
      ),
    ).toEqual(["gamblingKing"]);
  });

  it("breaks a tie for the first to reach the score", () => {
    expect(
      ahead([
        { memberId: "later", score: 5, reachedAt: at(9) },
        { memberId: "first", score: 5, reachedAt: at(4) },
        { memberId: "behind", score: 3, reachedAt: at(1) },
      ])?.memberId,
    ).toBe("first");
  });

  it("counts the weeks from Wednesday, the day titles change", () => {
    expect(titleWeek(new Date("2026-10-07T05:00:00Z"))).toBe("2026-10-07");
    expect(titleWeek(new Date("2026-10-13T23:00:00Z"))).toBe("2026-10-07");
    expect(titleWeek(new Date("2026-10-06T12:00:00Z"))).toBe("2026-09-30");
  });
});
