import { describe, expect, it } from "vitest";
import {
  CHIFOUMI_HEADER,
  chifoumiLoser,
  chifoumiRefusal,
  chifoumiScore,
  parseChifoumi,
  roundWinner,
  type ChifoumiGame,
} from "./chifoumis.ts";
import { TextFormatError } from "./textFormat.ts";

/** Thom challenges Vorn for 300 po: a draw, then Vorn's paper, then Thom's rock twice. */
const TEXT = [
  CHIFOUMI_HEADER,
  "G;Thom Leboss#1#1;Thom Leboss;Vorn Cendrelune;300;1796904000;1796904100",
  "M;pierre;pierre",
  "M;pierre;feuille",
  "M;pierre;ciseaux",
  "M;feuille;pierre",
  "B;Sira Ventargent;Thom Leboss;100",
  "Y;Thom Leboss;1796904500",
].join("\n");

describe("Chi Fou Mi", () => {
  it("reads a game: its players, its stake, every round and the guild's stakes", () => {
    const game = parseChifoumi(TEXT);
    expect(game).toMatchObject({
      id: "Thom Leboss#1#1",
      challenger: "Thom Leboss",
      challenged: "Vorn Cendrelune",
      stake: 300,
      bets: [{ bettor: "Sira Ventargent", choice: "Thom Leboss", amount: 100 }],
      paid: { by: "Thom Leboss", at: new Date(1796904500 * 1000) },
    });
    expect(game.rounds).toHaveLength(4);
    expect(() => parseChifoumi(`${CHIFOUMI_HEADER}\nM;pierre;lézard`)).toThrow(TextFormatError);
  });

  it("knows who wins a round: rock blunts scissors, paper wraps rock, scissors cut paper; a draw counts for nobody", () => {
    expect(roundWinner({ challenger: "pierre", challenged: "ciseaux" })).toBe("challenger");
    expect(roundWinner({ challenger: "pierre", challenged: "feuille" })).toBe("challenged");
    expect(roundWinner({ challenger: "ciseaux", challenged: "feuille" })).toBe("challenger");
    expect(roundWinner({ challenger: "feuille", challenged: "feuille" })).toBeUndefined();
  });

  it("ends at two rounds won, at the best of three, and loses the other player", () => {
    const game = parseChifoumi(TEXT);
    expect(chifoumiScore(game.rounds)).toEqual({ challenger: 2, challenged: 1 });
    expect(chifoumiLoser(game)).toBe("Vorn Cendrelune");
    expect(chifoumiRefusal(game)).toBeUndefined();
  });

  it("refuses a game played alone, unfinished, or going on once won; a stake of 0 po is a game", () => {
    const game: ChifoumiGame = { ...parseChifoumi(TEXT), stake: 0 };
    expect(chifoumiRefusal(game)).toBeUndefined();
    expect(chifoumiRefusal({ ...game, challenged: game.challenger })).toBe("Un Chi Fou Mi se joue à deux.");
    expect(chifoumiRefusal({ ...game, rounds: game.rounds.slice(0, 3) })).toBe("La partie n'est pas finie.");
    expect(
      chifoumiRefusal({ ...game, rounds: [...game.rounds, { challenger: "pierre", challenged: "ciseaux" }] }),
    ).toBe("La partie continue après sa 2e manche gagnée.");
  });
});
