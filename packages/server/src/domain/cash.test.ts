import { describe, expect, it } from "vitest";
import { cashMovementRefusal, cashSummary, signedAmount } from "./cash.ts";

describe("guild cash", () => {
  const donation = { kind: "donation" as const, amount: 500, label: "Don de Vorn", memberId: "member" };

  it("takes donations in and sends expenses and rewards out", () => {
    expect(signedAmount("donation", 500)).toBe(500);
    expect(signedAmount("expense", 850)).toBe(-850);
    expect(signedAmount("reward", 2000)).toBe(-2000);
  });

  it("records whole gold pieces with a label, and a donation with its giver", () => {
    expect(cashMovementRefusal(donation)).toBeUndefined();
    expect(cashMovementRefusal({ ...donation, kind: "expense", memberId: undefined })).toBeUndefined();
    expect(cashMovementRefusal({ ...donation, amount: 0 })).toMatch(/1 po au moins/);
    expect(cashMovementRefusal({ ...donation, amount: 1.5 })).toMatch(/entières/);
    expect(cashMovementRefusal({ ...donation, label: "  " })).toMatch(/libellé/);
    expect(cashMovementRefusal({ ...donation, memberId: undefined })).toMatch(/membre qui a donné/);
    expect(cashMovementRefusal({ ...donation, kind: "bet_share" as "donation" })).toMatch(/don, une dépense/);
  });

  it("sums the balance, and the entries and exits since the start of the month", () => {
    const at = (iso: string) => new Date(iso);
    const movements = [
      { amount: 1000, occurredAt: at("2026-09-20T20:00:00Z") },
      { amount: 100, occurredAt: at("2026-10-02T20:00:00Z") },
      { amount: -850, occurredAt: at("2026-10-03T20:00:00Z") },
      { amount: 500, occurredAt: at("2026-10-04T20:00:00Z") },
    ];
    expect(cashSummary(movements, at("2026-09-30T22:00:00Z"))).toEqual({ balance: 750, entries: 600, exits: -850 });
  });
});
