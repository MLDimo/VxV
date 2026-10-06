/**
 * The guild's cash (P11.9): every gold piece VXV manages, visible to all. Entries: the organisation's share of the
 * bets, the members' donations; exits: rewards and expenses. Each movement carries its reason; none is ever changed.
 */

export const CASH_MOVEMENT_KINDS = ["bet_share", "donation", "expense", "reward"] as const;
export type CashMovementKind = (typeof CASH_MOVEMENT_KINDS)[number];

/** What the treasurer records by hand; the bets' shares come with their result. */
export const MANUAL_CASH_KINDS = ["donation", "expense", "reward"] as const satisfies readonly CashMovementKind[];
export type ManualCashKind = (typeof MANUAL_CASH_KINDS)[number];

export const CASH_KIND_LABELS: Record<CashMovementKind, string> = {
  bet_share: "Part des paris",
  donation: "Don",
  expense: "Dépense",
  reward: "Récompense",
};

export const MAX_CASH_LABEL_LENGTH = 100;

export interface CashMovement {
  id: string;
  occurredAt: Date;
  kind: CashMovementKind;
  /** Positive for an entry, negative for an exit. */
  amount: number;
  label: string;
  reason: string;
  recordedByName: string;
  /** The giver of a donation: their id, and their name as shown. */
  memberId: string | undefined;
  memberName: string | undefined;
}

/** A movement the treasurer records: the amount as typed, always positive; its kind gives the direction. */
export interface NewCashMovement {
  kind: ManualCashKind;
  amount: number;
  label: string;
  /** The member who gave, for a donation. */
  memberId: string | undefined;
}

/** The movement's amount in the cash: positive for a donation, negative for an expense or a reward. */
export function signedAmount(kind: ManualCashKind, amount: number): number {
  return kind === "donation" ? amount : -amount;
}

/** Why the treasurer cannot record this movement, or undefined. */
export function cashMovementRefusal(movement: NewCashMovement): string | undefined {
  if (!MANUAL_CASH_KINDS.includes(movement.kind)) {
    return "Choisis un don, une dépense ou une récompense.";
  }
  if (!Number.isInteger(movement.amount) || movement.amount < 1) {
    return "Montant en pièces d'or entières, 1 po au moins.";
  }
  const label = movement.label.trim();
  if (label === "" || label.length > MAX_CASH_LABEL_LENGTH) {
    return `Donne au mouvement un libellé de ${String(MAX_CASH_LABEL_LENGTH)} caractères au plus.`;
  }
  if (movement.kind === "donation" && movement.memberId === undefined) {
    return "Indique le membre qui a donné.";
  }
  return undefined;
}

export interface CashSummary {
  balance: number;
  /** Entries and exits since the start of the period (the month). */
  entries: number;
  exits: number;
}

export function cashSummary(movements: readonly Pick<CashMovement, "amount" | "occurredAt">[], since: Date) {
  const recent = movements.filter((movement) => movement.occurredAt >= since);
  const total = (amounts: number[]) => amounts.reduce((sum, amount) => sum + amount, 0);
  return {
    balance: total(movements.map((movement) => movement.amount)),
    entries: total(recent.filter((movement) => movement.amount > 0).map((movement) => movement.amount)),
    exits: total(recent.filter((movement) => movement.amount < 0).map((movement) => movement.amount)),
  } satisfies CashSummary;
}
