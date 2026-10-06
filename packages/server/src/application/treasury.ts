import { collectionRefusal, debtOf, paymentRefusal, type Stake } from "../domain/bets.ts";
import type { Member } from "../domain/members.ts";
import { treasuryBook, type TreasuryBook } from "../domain/treasury.ts";
import { ValidationError } from "./errors.ts";
import { checkTreasurerAction } from "./officerActions.ts";
import type { Clock, Repositories, UnitOfWork } from "./ports.ts";

/** How many validations the treasurer's history shows. */
export const TREASURY_HISTORY_SIZE = 100;

async function requireStake({ stakes }: Repositories, stakeId: string): Promise<Stake> {
  const stake = await stakes.findById(stakeId);
  if (stake === undefined) {
    throw new ValidationError("Cette mise n'existe pas.");
  }
  return stake;
}

/** The treasurer's book (P11.6): gold received and handed over, noted by the treasurer, visible to all. */
export function createTreasury({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    book(): Promise<TreasuryBook> {
      return unitOfWork.run(async ({ stakes }) =>
        treasuryBook(await stakes.listPending(), await stakes.listValidated(TREASURY_HISTORY_SIZE)),
      );
    },

    /** What the member owes: the stakes they lost without paying them. */
    debtOf(member: Member): Promise<number> {
      return unitOfWork.run(async ({ stakes }) => debtOf(await stakes.listByMember(member.id)));
    },

    /** The treasurer received the stake, or the debt it became. */
    async markPaid(treasurer: Member, stakeId: string): Promise<void> {
      checkTreasurerAction(treasurer);
      await unitOfWork.run(async (repositories) => {
        const refusal = paymentRefusal(await requireStake(repositories, stakeId));
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        await repositories.stakes.markPaid(stakeId, treasurer.id, clock());
      });
    },

    /** The treasurer handed the member their gain, or their refund. */
    async markCollected(treasurer: Member, stakeId: string): Promise<void> {
      checkTreasurerAction(treasurer);
      await unitOfWork.run(async (repositories) => {
        const refusal = collectionRefusal(await requireStake(repositories, stakeId));
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        await repositories.stakes.markCollected(stakeId, treasurer.id, clock());
      });
    },
  };
}

export type Treasury = ReturnType<typeof createTreasury>;
