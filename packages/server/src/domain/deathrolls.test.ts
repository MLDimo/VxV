import { describe, expect, it } from "vitest";
import {
  DEATHROLL_HEADER,
  deathrollLoser,
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
  "R;Ðéjà Vu;87;0",
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
        { character: "Ðéjà Vu", high: 87, result: 0 },
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

  it("refuses the challenger rolling first, a roll out of range, a game going on after a 0 or not over", () => {
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
          { character: "Ðéjà Vu", high: 1000, result: 0 },
          { character: "Thom Leboss", high: 0, result: 0 },
        ]),
      ),
    ).toBe("La partie continue après un 0.");
    // From 0 to the previous result: a 1 leaves the next player a roll from 0 to 1.
    expect(deathrollRefusal(withRolls([{ character: "Ðéjà Vu", high: 1000, result: 1 }]))).toBe(
      "La partie n'est pas finie.",
    );
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
