import { describe, expect, it } from "vitest";
import {
  betBook,
  cleanChoices,
  collectionRefusal,
  debtOf,
  endRefusal,
  isDebt,
  isOpen,
  newBetRefusal,
  PAID_STAKE,
  payout,
  potentialGain,
  refund,
  paymentRefusal,
  settle,
  stakeRefusal,
  standing,
  type BetChoice,
  type Stake,
} from "./bets.ts";

const CHOICES: BetChoice[] = [
  { id: "tank", label: "Un tank" },
  { id: "heal", label: "Un heal" },
  { id: "melee", label: "Un DPS mêlée" },
  { id: "ranged", label: "Un DPS distance" },
];

let nextId = 0;
function stake(choiceId: string, amount: number, paid = false): Stake {
  nextId += 1;
  return {
    id: `s${String(nextId)}`,
    betId: "bet",
    memberId: `m${String(nextId)}`,
    memberName: `Joueur ${String(nextId)}`,
    memberClass: undefined,
    choiceId,
    amount,
    placedAt: new Date("2026-10-06T20:00:00Z"),
    paidAt: paid ? new Date("2026-10-06T20:30:00Z") : undefined,
    outcome: undefined,
    gain: undefined,
    collectedAt: undefined,
  };
}

/** The overview's mock-up: 1 000 po on « Qui meurt en premier sur le boss 10 ? ». */
const MOCK_UP = [
  ...[40, 40, 40, 40, 40].map((amount) => stake("tank", amount)),
  ...[50, 50, 50, 50, 50, 25, 25].map((amount) => stake("heal", amount)),
  ...[50, 50, 50, 50, 50, 50, 40, 40, 40].map((amount) => stake("melee", amount)),
  ...[40, 40].map((amount) => stake("ranged", amount)),
];

describe("bets", () => {
  it("shows the pool, each choice's share and odds, the organisation taking 10 %", () => {
    const book = betBook({ choices: CHOICES }, MOCK_UP);
    expect(book.pool).toBe(1000);
    expect(book.bettors).toBe(23);
    expect(book.choices.map(({ choice, total, bettors, share }) => [choice.id, total, bettors, share])).toEqual([
      ["tank", 200, 5, 0.2],
      ["heal", 300, 7, 0.3],
      ["melee", 420, 9, 0.42],
      ["ranged", 80, 2, 0.08],
    ]);
    expect(book.choices.map(({ odds }) => odds?.toFixed(2))).toEqual(["4.50", "3.00", "2.14", "11.25"]);
    expect(potentialGain(book, "tank", 50)).toBe(225);
  });

  it("has no odds on a choice nobody staked on", () => {
    const book = betBook({ choices: CHOICES }, [stake("tank", 10)]);
    expect(book.choices[1]?.odds).toBeUndefined();
    expect(potentialGain(book, "heal", 10)).toBe(0);
  });

  it("shares the pool between the winners by their stakes, rounded down, the rest to the guild's cash", () => {
    const stakes = [stake("tank", 50), stake("tank", 25), stake("heal", 100), stake("melee", 33)];
    const { stakes: settled, organisation } = settle(stakes, "tank");
    // Pool 208, the organisation's 10 % is 20.8: 187.2 shared between 75 po of winning stakes.
    expect(settled.map(({ outcome, gain }) => [outcome, gain])).toEqual([
      ["won", 124],
      ["won", 62],
      ["lost", 0],
      ["lost", 0],
    ]);
    expect(organisation).toBe(208 - 124 - 62);
  });

  it("gives everything to the organisation when nobody staked on the winner", () => {
    const stakes = [stake("heal", 100), stake("melee", 50)];
    const { stakes: settled, organisation } = settle(stakes, "tank");
    expect(settled.every((entry) => entry.outcome === "lost")).toBe(true);
    expect(organisation).toBe(150);
  });

  it("gives everyone their stake back, the organisation nothing, when everybody staked on the winner", () => {
    const stakes = [stake("tank", 100), stake("tank", 7)];
    const { stakes: settled, organisation } = settle(stakes, "tank");
    expect(settled.map(({ outcome, gain }) => [outcome, gain])).toEqual([
      ["won", 100],
      ["won", 7],
    ]);
    expect(organisation).toBe(0);
  });

  it("never lets a winner lose: the organisation's share stops at the losing stakes", () => {
    const stakes = [stake("tank", 95), stake("heal", 5)];
    const book = betBook({ choices: CHOICES }, stakes);
    expect(book.choices[0]?.odds).toBe(1);
    const { stakes: settled, organisation } = settle(stakes, "tank");
    expect(settled[0]?.gain).toBe(95);
    expect(organisation).toBe(5);
  });

  it("refunds every stake of a cancelled bet", () => {
    const { stakes: settled, organisation } = refund([stake("tank", 20), stake("heal", 30)]);
    expect(settled.map(({ outcome, gain }) => [outcome, gain])).toEqual([
      ["refunded", 20],
      ["refunded", 30],
    ]);
    expect(organisation).toBe(0);
  });

  it("deducts a stake not paid yet from its gain, and turns a lost one into a debt", () => {
    const unpaid = stake("tank", 50);
    const paid = stake("tank", 50, true);
    expect(payout(unpaid, { outcome: "won", gain: 225 })).toBe(175);
    expect(payout(paid, { outcome: "won", gain: 225 })).toBe(225);
    expect(payout(unpaid, { outcome: "refunded", gain: 50 })).toBe(0);
    expect(payout(paid, { outcome: "refunded", gain: 50 })).toBe(50);
    expect(payout(unpaid, { outcome: "lost", gain: 0 })).toBe(0);
    expect(isDebt(unpaid, "lost")).toBe(true);
    expect(isDebt(paid, "lost")).toBe(false);
    expect(isDebt(unpaid, "won")).toBe(false);
    expect(isDebt(unpaid, undefined)).toBe(false);
  });

  describe("rules", () => {
    const now = new Date("2026-10-06T20:00:00Z");
    const later = new Date("2026-10-08T19:00:00Z");
    const open = { title: "Qui meurt en premier sur le boss 10 ?", choices: ["Un tank", "Un heal"], closesAt: later };

    it("opens a bet with a title, two to ten distinct choices and a closing time to come", () => {
      expect(newBetRefusal(open, now)).toBeUndefined();
      expect(newBetRefusal({ ...open, title: "  " }, now)).toMatch(/titre/);
      expect(newBetRefusal({ ...open, choices: ["Un tank"] }, now)).toMatch(/de 2 à 10 choix/);
      expect(newBetRefusal({ ...open, choices: ["Oui", "oui"] }, now)).toMatch(/même nom/);
      expect(newBetRefusal({ ...open, choices: ["Oui", "x".repeat(51)] }, now)).toMatch(/50 caractères/);
      expect(newBetRefusal({ ...open, closesAt: now }, now)).toMatch(/à venir/);
      expect(cleanChoices([" Un tank ", "", "  ", "Un heal"])).toEqual(["Un tank", "Un heal"]);
    });

    it("takes whole gold pieces on one of the bet's choices until the closing time, unless the stake is paid", () => {
      const bet = { choices: CHOICES, closesAt: later, endedAt: undefined };
      expect(stakeRefusal(bet, { choiceId: "tank", amount: 1, existing: undefined }, now)).toBeUndefined();
      expect(stakeRefusal(bet, { choiceId: "tank", amount: 1, existing: undefined }, later)).toMatch(/fermé/);
      expect(stakeRefusal(bet, { choiceId: "other", amount: 1, existing: undefined }, now)).toMatch(/choix/);
      expect(stakeRefusal(bet, { choiceId: "tank", amount: 0, existing: undefined }, now)).toMatch(/1 po au moins/);
      expect(stakeRefusal(bet, { choiceId: "tank", amount: 2.5, existing: undefined }, now)).toMatch(/entières/);
      const paid = { paidAt: now };
      expect(stakeRefusal(bet, { choiceId: "tank", amount: 5, existing: paid }, now)).toBe(PAID_STAKE);
    });
  });

  describe("ending and the treasurer", () => {
    const now = new Date("2026-10-06T20:00:00Z");
    const PAID = new Date("2026-10-06T20:30:00Z");

    it("closes a bet once it ended, even before its closing time, and ends it once", () => {
      const bet = { choices: CHOICES, closesAt: new Date("2026-10-08T19:00:00Z"), endedAt: undefined };
      expect(isOpen(bet, now)).toBe(true);
      expect(isOpen({ ...bet, endedAt: now }, now)).toBe(false);
      expect(endRefusal(bet, "tank")).toBeUndefined();
      expect(endRefusal(bet, undefined)).toBeUndefined();
      expect(endRefusal(bet, "other")).toMatch(/choix gagnant/);
      expect(endRefusal({ ...bet, endedAt: now }, "tank")).toMatch(/déjà terminé/);
    });

    it("tells where each stake stands with the treasurer", () => {
      const placed = { amount: 50, paidAt: undefined, outcome: undefined, gain: undefined, collectedAt: undefined };
      expect(standing(placed)).toBe("toPay");
      expect(standing({ ...placed, paidAt: PAID })).toBe("paid");
      expect(standing({ ...placed, outcome: "lost", gain: 0 })).toBe("debt");
      expect(standing({ ...placed, outcome: "lost", gain: 0, paidAt: PAID })).toBe("settled");
      expect(standing({ ...placed, outcome: "won", gain: 225 })).toBe("toCollect");
      expect(standing({ ...placed, outcome: "won", gain: 50 })).toBe("settled");
      expect(standing({ ...placed, outcome: "won", gain: 225, collectedAt: PAID })).toBe("collected");
      expect(standing({ ...placed, outcome: "refunded", gain: 50 })).toBe("settled");
      expect(standing({ ...placed, outcome: "refunded", gain: 50, paidAt: PAID })).toBe("toCollect");
      expect(
        debtOf([
          { ...placed, outcome: "lost", gain: 0 },
          { ...placed, amount: 30, outcome: "lost", gain: 0 },
        ]),
      ).toBe(80);
    });

    it("notes a stake paid once, and a gain handed over once, when there is one", () => {
      const placed = { amount: 50, paidAt: undefined, outcome: undefined, gain: undefined, collectedAt: undefined };
      expect(paymentRefusal(placed)).toBeUndefined();
      expect(paymentRefusal({ ...placed, paidAt: PAID })).toMatch(/déjà payée/);
      expect(paymentRefusal({ ...placed, collectedAt: PAID })).toMatch(/déjà versé/);
      expect(collectionRefusal({ ...placed, outcome: "won", gain: 225 })).toBeUndefined();
      expect(collectionRefusal({ ...placed, outcome: "won", gain: 225, collectedAt: PAID })).toMatch(/déjà versé/);
      expect(collectionRefusal({ ...placed, outcome: "lost", gain: 0 })).toMatch(/rien à verser/);
      expect(collectionRefusal(placed)).toMatch(/rien à verser/);
    });
  });
});
