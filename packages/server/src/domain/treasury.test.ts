import { describe, expect, it } from "vitest";
import type { LedgerStake } from "./treasury.ts";
import { treasuryBook } from "./treasury.ts";

const PLACED = new Date("2026-10-06T19:00:00Z");
const PAID = new Date("2026-10-06T20:00:00Z");
const HANDED = new Date("2026-10-08T21:00:00Z");

function ledger(id: string, overrides: Partial<LedgerStake>): LedgerStake {
  return {
    id,
    betId: "bet",
    memberId: `member-${id}`,
    memberName: `Joueur ${id}`,
    memberClass: undefined,
    choiceId: "tank",
    amount: 50,
    placedAt: PLACED,
    paidAt: undefined,
    outcome: undefined,
    gain: undefined,
    collectedAt: undefined,
    betTitle: "Qui meurt en premier ?",
    choiceLabel: "Un tank",
    paidByName: undefined,
    collectedByName: undefined,
    ...overrides,
  };
}

describe("treasurer's book", () => {
  it("sorts the stakes to receive, the debts and the gains to hand over, less the stakes never paid", () => {
    const book = treasuryBook(
      [
        ledger("placed", {}),
        ledger("lost", { outcome: "lost", gain: 0 }),
        ledger("won-unpaid", { outcome: "won", gain: 225 }),
        ledger("won-paid", { outcome: "won", gain: 225, paidAt: PAID, paidByName: "Trésorier" }),
      ],
      [],
    );
    expect(book.toPay.map((stake) => stake.id)).toEqual(["placed"]);
    expect(book.debts.map((stake) => stake.id)).toEqual(["lost"]);
    expect(book.toCollect.map(({ stake, amount }) => [stake.id, amount])).toEqual([
      ["won-unpaid", 175],
      ["won-paid", 225],
    ]);
  });

  it("lists every validation, the latest first, with what changed hands", () => {
    const { history } = treasuryBook(
      [],
      [
        ledger("won", {
          outcome: "won",
          gain: 225,
          paidAt: PAID,
          paidByName: "Trésorier",
          collectedAt: HANDED,
          collectedByName: "Trésorière",
        }),
      ],
    );
    expect(history.map(({ kind, at, treasurerName, amount }) => [kind, at, treasurerName, amount])).toEqual([
      ["collected", HANDED, "Trésorière", 225],
      ["paid", PAID, "Trésorier", 50],
    ]);
  });
});
