import { describe, expect, it } from "vitest";
import {
  DEATHROLL_HEADER,
  deathrollLoser,
  deathrollRanking,
  deathrollBets,
  deathrollRefusal,
  parseDeathroll,
  type DeathrollGame,
} from "./deathrolls.ts";
import { TextFormatError } from "./textFormat.ts";

const at = (seconds: number) => new Date(seconds * 1000);
const GAME = [
  DEATHROLL_HEADER,
  "G;Thom Leboss#1796904000#1;Thom Leboss;Ðéjà Vu;500;1000;1796904000;1796904120",
  "R;Ðéjà Vu;1000;412",
  "R;Thom Leboss;412;87",
  "R;Ðéjà Vu;87;1",
  "B;Ciel Gris;Thom Leboss;100",
  "Y;Thom Leboss;1796990400",
].join("\n");

describe("a deathroll from the addon", () => {
  it("reads the players, the stake, the rolls, the guild's stakes and the payment's confirmation", () => {
    const game = parseDeathroll(GAME);
    expect(game).toEqual({
      id: "Thom Leboss#1796904000#1",
      challenger: "Thom Leboss",
      challenged: "Ðéjà Vu",
      stake: 500,
      start: 1000,
      acceptedAt: at(1796904000),
      endedAt: at(1796904120),
      rolls: [
        { character: "Ðéjà Vu", high: 1000, result: 412 },
        { character: "Thom Leboss", high: 412, result: 87 },
        { character: "Ðéjà Vu", high: 87, result: 1 },
      ],
      bets: [{ bettor: "Ciel Gris", choice: "Thom Leboss", amount: 100 }],
      paid: { by: "Thom Leboss", at: at(1796990400) },
    });
    expect(deathrollLoser(game)).toBe("Ðéjà Vu");
    expect(deathrollRefusal(game)).toBeUndefined();
  });

  it("lists every problem with its line, and needs the game's line", () => {
    expect(() => parseDeathroll([DEATHROLL_HEADER, "G;x;A B;C D;cinq;1000;1;2", "R;A B;x;1"].join("\n"))).toThrow(
      TextFormatError,
    );
    expect(() => parseDeathroll(DEATHROLL_HEADER)).toThrow(/ligne G manquante/);
    expect(() => parseDeathroll("VXV-LOG-2")).toThrow(/VXV-DEATHROLL-1/);
  });
});

describe("the deathroll's rules", () => {
  const game = parseDeathroll(GAME);
  const withRolls = (rolls: DeathrollGame["rolls"]): DeathrollGame => ({ ...game, rolls });

  it("refuses the challenger rolling first, a roll out of range, a game going on after a 1 or not over", () => {
    expect(deathrollRefusal(withRolls([{ character: "Thom Leboss", high: 1000, result: 1 }]))).toBe(
      "Roll 1 hors des règles.",
    );
    expect(
      deathrollRefusal(
        withRolls([
          { character: "Ðéjà Vu", high: 1000, result: 412 },
          { character: "Thom Leboss", high: 1000, result: 1 },
        ]),
      ),
    ).toBe("Roll 2 hors des règles.");
    expect(
      deathrollRefusal(
        withRolls([
          { character: "Ðéjà Vu", high: 1000, result: 1 },
          { character: "Thom Leboss", high: 1, result: 1 },
        ]),
      ),
    ).toBe("La partie continue après un 1.");
    expect(deathrollRefusal(withRolls([{ character: "Ðéjà Vu", high: 1000, result: 412 }]))).toBe(
      "La partie n'est pas finie.",
    );
  });

  it("counts the guild's stakes on a player by someone else only", () => {
    const bets = [
      { bettor: "Ciel Gris", choice: "Thom Leboss", amount: 100 },
      { bettor: "Thom Leboss", choice: "Thom Leboss", amount: 10 },
      { bettor: "Aube Claire", choice: "Aube Claire", amount: 10 },
      { bettor: "Brume Noire", choice: "Ðéjà Vu", amount: 0 },
    ];
    expect(deathrollBets({ ...game, bets })).toEqual([{ bettor: "Ciel Gris", choice: "Thom Leboss", amount: 100 }]);
  });
});

describe("the deathroll's ranking", () => {
  it("adds up each member's won and lost stakes over the period, the best net gain first", () => {
    const games = [
      { winnerId: "thom", loserId: "deja", stake: 500, endedAt: at(100) },
      { winnerId: "deja", loserId: "thom", stake: 200, endedAt: at(200) },
      { winnerId: "ciel", loserId: "deja", stake: 50, endedAt: at(300) },
    ];
    expect(deathrollRanking(games, undefined)).toEqual([
      { rank: 1, memberId: "thom", net: 300, games: 2, biggestWin: 500 },
      { rank: 2, memberId: "ciel", net: 50, games: 1, biggestWin: 50 },
      { rank: 3, memberId: "deja", net: -350, games: 3, biggestWin: 200 },
    ]);
    expect(deathrollRanking(games, at(150)).map((row) => [row.memberId, row.net])).toEqual([
      ["deja", 150],
      ["ciel", 50],
      ["thom", -200],
    ]);
  });
});
