import { describe, expect, it } from "vitest";
import { bettorsRanking, type RankedStake } from "./ranking.ts";

const SEPTEMBER = new Date("2026-09-20T20:00:00Z");
const OCTOBER = new Date("2026-10-05T20:00:00Z");
const PAID = new Date("2026-09-01T20:00:00Z");

function stake(memberName: string, outcome: RankedStake["outcome"], amount: number, gain: number, endedAt = OCTOBER) {
  return {
    memberId: memberName,
    memberName,
    memberClass: "ROGUE",
    memberRace: undefined,
    memberSex: undefined,
    amount,
    gain,
    outcome,
    endedAt,
    paidAt: PAID,
  } satisfies RankedStake;
}

describe("bettors' ranking", () => {
  const stakes = [
    stake("Vorn", "won", 100, 450),
    stake("Vorn", "lost", 50, 0),
    stake("Thessa", "won", 200, 260),
    stake("Thessa", "won", 10, 30, SEPTEMBER),
    stake("Morgane", "lost", 150, 0),
    stake("Kaelys", "refunded", 40, 40),
  ];

  it("ranks by net gain, with the total won, the bets played and the success rate", () => {
    expect(
      bettorsRanking(stakes, undefined).map(({ rank, memberName, net, won, bets, successRate }) => [
        rank,
        memberName,
        net,
        won,
        bets,
        successRate,
      ]),
    ).toEqual([
      [1, "Vorn", 300, 450, 2, 0.5],
      [2, "Thessa", 80, 290, 2, 1],
      [3, "Morgane", -150, 0, 1, 0],
    ]);
  });

  it("counts only the bets ended in the period, refunds aside", () => {
    expect(
      bettorsRanking(stakes, new Date("2026-10-01T00:00:00Z")).map(({ memberName, net }) => [memberName, net]),
    ).toEqual([
      ["Vorn", 300],
      ["Thessa", 60],
      ["Morgane", -150],
    ]);
  });

  it("shows a bettor's debt, whatever the period", () => {
    const unpaid = { ...stake("Morgane", "lost", 150, 0, SEPTEMBER), paidAt: undefined };
    const [morgane] = bettorsRanking([unpaid, stake("Morgane", "won", 10, 20)], OCTOBER);
    expect(morgane).toMatchObject({ memberName: "Morgane", bets: 1, debt: 150 });
  });
});
