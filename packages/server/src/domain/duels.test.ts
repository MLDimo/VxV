import { describe, expect, it } from "vitest";
import {
  answerRefusal,
  cancelRefusal,
  duelFeats,
  duelStatus,
  eloRatings,
  expectedScore,
  newDuelRefusal,
  resultRefusal,
  type Duel,
} from "./duels.ts";

const now = new Date("2026-12-01T12:00:00Z");
const tomorrow = new Date("2026-12-02T20:00:00Z");
const duel = (overrides: Partial<Duel> = {}): Duel => ({
  id: "d1",
  challengerId: "vorn",
  opponentId: "morgane",
  scheduledAt: tomorrow,
  place: "Porte d'Orgrimmar",
  createdAt: now,
  accepted: undefined,
  betId: undefined,
  winnerId: undefined,
  playedAt: undefined,
  cancelledAt: undefined,
  discordMessage: undefined,
  ...overrides,
});
const scheduled = duel({ accepted: true, betId: "b1" });

describe("duelStatus", () => {
  it("follows the challenge from its proposal to its end", () => {
    expect(duelStatus(duel())).toBe("proposed");
    expect(duelStatus(duel({ accepted: false }))).toBe("refused");
    expect(duelStatus(scheduled)).toBe("scheduled");
    expect(duelStatus({ ...scheduled, winnerId: "vorn", playedAt: tomorrow })).toBe("played");
    expect(duelStatus({ ...scheduled, cancelledAt: now })).toBe("cancelled");
  });
});

describe("newDuelRefusal", () => {
  const challenge = { opponentId: "morgane", scheduledAt: tomorrow, place: "Porte d'Orgrimmar" };

  it("accepts a challenge to another member, in the future, at a place", () => {
    expect(newDuelRefusal("vorn", challenge, now)).toBeUndefined();
  });

  it.each([
    ["oneself", { opponentId: "vorn" }, /autre joueur/],
    ["a past time", { scheduledAt: new Date("2026-11-30T20:00:00Z") }, /dans le futur/],
    ["an invalid time", { scheduledAt: new Date("invalid") }, /dans le futur/],
    ["no place", { place: " " }, /lieu du duel/],
    ["a place too long", { place: "x".repeat(61) }, /60 caractères/],
  ])("refuses %s", (_case, change, message) => {
    expect(newDuelRefusal("vorn", { ...challenge, ...change }, now)).toMatch(message);
  });
});

describe("answerRefusal", () => {
  it("lets the opponent answer once, before the time", () => {
    expect(answerRefusal(duel(), "morgane", now)).toBeUndefined();
    expect(answerRefusal(duel(), "vorn", now)).toMatch(/joueur défié/);
    expect(answerRefusal(scheduled, "morgane", now)).toMatch(/déjà sa réponse/);
    expect(answerRefusal(duel(), "morgane", tomorrow)).toMatch(/heure du duel est passée/);
  });
});

describe("cancelRefusal", () => {
  it("lets a duelist or an officer call off a duel not over yet", () => {
    expect(cancelRefusal(duel(), "vorn")).toBeUndefined();
    expect(cancelRefusal(scheduled, "morgane")).toBeUndefined();
    expect(cancelRefusal(scheduled, undefined)).toBeUndefined();
    expect(cancelRefusal(scheduled, "thessa")).toMatch(/deux joueurs/);
    expect(cancelRefusal(duel({ accepted: false }), "vorn")).toMatch(/terminé/);
  });
});

describe("resultRefusal", () => {
  it("records a duelist's win of an accepted duel, from the loser or an officer", () => {
    expect(resultRefusal(scheduled, "vorn", "morgane")).toBeUndefined();
    expect(resultRefusal(scheduled, "morgane", undefined)).toBeUndefined();
    expect(resultRefusal(scheduled, "thessa", undefined)).toMatch(/l'un des deux joueurs/);
    expect(resultRefusal(scheduled, "vorn", "thessa")).toMatch(/deux joueurs/);
    expect(resultRefusal(duel(), "vorn", "morgane")).toMatch(/n'attend pas de résultat/);
  });
});

describe("Elo", () => {
  it("expects an even duel between equals, and a long shot against a far stronger player", () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
    expect(expectedScore(1500, 1900)).toBeCloseTo(1 / 11);
    expect(expectedScore(1900, 1500)).toBeCloseTo(10 / 11);
  });

  it("gives K × (1 − E) to the winner, takes it from the loser, in the order the duels were played", () => {
    const at = (day: number) => new Date(Date.UTC(2026, 11, day));
    const ratings = eloRatings([
      // Listed out of order: Morgane beat Thessa before losing to Vorn.
      { winnerId: "vorn", loserId: "morgane", playedAt: at(3) },
      { winnerId: "morgane", loserId: "thessa", playedAt: at(2) },
    ]);
    // Between equals, 20 × (1 − 0.5) = 10 points; Vorn, still at 1500, then beats Morgane at 1510.
    const vornGain = 20 * (1 - expectedScore(1500, 1510));
    expect(ratings).toEqual([
      { memberId: "vorn", rating: 1500 + vornGain, played: 1, won: 1 },
      { memberId: "morgane", rating: 1510 - vornGain, played: 2, won: 1 },
      { memberId: "thessa", rating: 1490, played: 1, won: 0 },
    ]);
    // Beating a stronger player brings more than 10 points.
    expect(vornGain).toBeGreaterThan(10);
  });
});

describe("duelFeats", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 11, day));

  it("names the most wins, the most duels and the longest run of wins", () => {
    expect(
      duelFeats([
        { winnerId: "vorn", loserId: "morgane", playedAt: at(1) },
        { winnerId: "vorn", loserId: "thessa", playedAt: at(2) },
        { winnerId: "morgane", loserId: "vorn", playedAt: at(3) },
        { winnerId: "morgane", loserId: "thessa", playedAt: at(4) },
        { winnerId: "morgane", loserId: "kaelys", playedAt: at(5) },
      ]),
    ).toEqual([
      { label: "Plus de victoires", value: "3 victoires", memberId: "morgane" },
      { label: "Plus de duels", value: "4 duels", memberId: "morgane" },
      { label: "Plus longue série", value: "3 victoires de suite", memberId: "morgane" },
    ]);
  });

  it("has no record before a duel is played", () => {
    expect(duelFeats([])).toEqual([]);
  });
});
