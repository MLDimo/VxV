import {
  cashMovementRefusal,
  cashSummary,
  signedAmount,
  type CashMovement,
  type CashSummary,
  type NewCashMovement,
} from "../domain/cash.ts";
import { startOfMonth } from "../domain/dateTime.ts";
import type { Member } from "../domain/members.ts";
import { ValidationError } from "./errors.ts";
import { checkTreasurerMovement } from "./officerActions.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

export interface CashOverview extends CashSummary {
  /** The latest first. */
  movements: CashMovement[];
}

/** The guild's cash (P11.9): its balance and movements for all to see; the treasurer records them with a reason. */
export function createCash({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    async overview(): Promise<CashOverview> {
      const movements = await unitOfWork.run(({ cash }) => cash.listAll());
      return { ...cashSummary(movements, startOfMonth(clock())), movements };
    },

    async record(treasurer: Member, movement: NewCashMovement, reason: string): Promise<void> {
      const motive = checkTreasurerMovement(treasurer, reason);
      const refusal = cashMovementRefusal(movement);
      if (refusal !== undefined) {
        throw new ValidationError(refusal);
      }
      await unitOfWork.run(async ({ cash, members }) => {
        if (movement.memberId !== undefined && (await members.findById(movement.memberId)) === undefined) {
          throw new ValidationError("Ce membre n'existe pas.");
        }
        await cash.record(
          {
            kind: movement.kind,
            amount: signedAmount(movement.kind, movement.amount),
            label: movement.label.trim(),
            reason: motive,
            recordedBy: treasurer.id,
            betId: undefined,
            memberId: movement.kind === "donation" ? movement.memberId : undefined,
          },
          clock(),
        );
      });
    },
  };
}

export type Cash = ReturnType<typeof createCash>;
