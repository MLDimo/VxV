import { describe, expect, it } from "vitest";
import { formatGold, formatSignedGold } from "./labels.ts";
import { betsBoard, deathrollsBoard, questsBoard, titlesBoard } from "./rankingBoards.ts";
import type { RankedStake } from "./ranking.ts";

const at = (day: number) => new Date(Date.UTC(2026, 9, day, 20));
const stake = (memberId: string, amount: number, gain: number, day: number, outcome: RankedStake["outcome"]) =>
  ({
    memberId,
    memberName: memberId,
    memberClass: "ROGUE",
    memberRace: undefined,
    memberSex: undefined,
    amount,
    gain,
    outcome,
    paidAt: at(day),
    endedAt: at(day),
  }) satisfies RankedStake;
/** The members are named after their ids. */
const name = (memberId: string) => memberId;
const values = (board: { rows: { memberId: string; value: number }[] }) =>
  board.rows.map(({ memberId, value }) => [memberId, value]);

describe("Ranking's boards", () => {
  it("ranks the bettors by net gain, with the biggest gain, the biggest loss and the most bets", () => {
    const board = betsBoard(
      [
        stake("vorn", 100, 1000, 2, "won"),
        stake("vorn", 50, 0, 3, "lost"),
        stake("morgane", 680, 0, 3, "lost"),
        stake("thessa", 10, 20, 4, "won"),
        stake("thessa", 10, 20, 4, "won"),
        stake("thessa", 10, 10, 4, "refunded"),
        stake("thessa", 500, 0, 1, "lost"),
      ],
      at(2),
      name,
    );
    expect(board.metric).toBe("gain net");
    expect(values(board)).toEqual([
      ["vorn", 850],
      ["thessa", 20],
      ["morgane", -680],
    ]);
    expect(board.records).toEqual([
      { label: "Plus gros gain", value: formatSignedGold(900), memberId: "vorn" },
      { label: "Plus grosse perte", value: formatSignedGold(-680), memberId: "morgane" },
      { label: "Paris joués", value: "2", memberId: "thessa" },
    ]);
  });

  it("ranks the deathroll's players by net gain, with the biggest win, the biggest defeat and the most games", () => {
    const board = deathrollsBoard(
      [
        { winnerId: "ulric", loserId: "brann", stake: 800, endedAt: at(3) },
        { winnerId: "brann", loserId: "ulric", stake: 200, endedAt: at(4) },
        { winnerId: "kaelys", loserId: "brann", stake: 100, endedAt: at(5) },
      ],
      undefined,
      name,
    );
    expect(values(board)).toEqual([
      ["ulric", 600],
      ["kaelys", 100],
      ["brann", -700],
    ]);
    expect(board.records.map(({ label, value, memberId }) => [label, value, memberId])).toEqual([
      ["Plus grosse victoire", formatSignedGold(800), "ulric"],
      ["Plus grosse défaite", formatSignedGold(-800), "brann"],
      ["Parties jouées", "3", "brann"],
    ]);
  });

  it("gives 3, 2 and 1 points for the places of each mission, with the most wins, the biggest reward and podiums", () => {
    const board = questsBoard(
      [
        { memberId: "sira", rank: 1, amount: 1400, at: at(7) },
        { memberId: "vorn", rank: 2, amount: 400, at: at(7) },
        { memberId: "thessa", rank: 3, amount: 200, at: at(7) },
        { memberId: "vorn", rank: 1, amount: 700, at: at(14) },
        { memberId: "sira", rank: 3, amount: 100, at: at(14) },
      ],
      undefined,
      name,
    );
    expect(board.metric).toBe("points de places");
    expect(values(board)).toEqual([
      ["vorn", 5],
      ["sira", 4],
      ["thessa", 1],
    ]);
    expect(board.records.map(({ label, value, memberId }) => [label, value, memberId])).toEqual([
      ["Plus de victoires", "1", "sira"],
      ["Plus grosse récompense", formatGold(1400), "sira"],
      ["Plus de podiums", "2", "sira"],
    ]);
  });

  it("counts the weeks of title held in the period, with the most titles in a week, the longest reign and titles", () => {
    const held = [
      { week: "2026-09-30", titleId: "gamblingKing", memberId: "vorn" },
      { week: "2026-10-07", titleId: "gamblingKing", memberId: "vorn" },
      { week: "2026-10-14", titleId: "gamblingKing", memberId: "vorn" },
      { week: "2026-10-07", titleId: "wellFed", memberId: "kaelys" },
      { week: "2026-10-07", titleId: "loser", memberId: "kaelys" },
      { week: "2026-10-14", titleId: "princess", memberId: "kaelys" },
    ];
    const board = titlesBoard(held, "2026-10-07", name);
    expect(values(board)).toEqual([
      ["kaelys", 3],
      ["vorn", 2],
    ]);
    expect(board.records.map(({ label, value, memberId }) => [label, value, memberId])).toEqual([
      ["Plus de titres en une semaine", "2", "kaelys"],
      ["Plus long règne", "2 semaines", "vorn"],
      ["Titres différents", "3", "kaelys"],
    ]);
    expect(titlesBoard(held, undefined, name).records[1]).toMatchObject({ value: "3 semaines", memberId: "vorn" });
  });
});
