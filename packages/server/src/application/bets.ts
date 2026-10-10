import {
  betBook,
  cleanChoices,
  endRefusal,
  isOpen,
  newBetRefusal,
  refund,
  settle,
  stakeRefusal,
  type Bet,
  type BetBook,
  type NewBet,
  type Settlement,
  type Stake,
} from "../domain/bets.ts";
import { DUELIST_STAKE, isDuelist } from "../domain/duels.ts";
import type { BetCreationRecord, BetEndRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { canGamble, GAMBLE_REFUSAL } from "../domain/permissions.ts";
import { debtRefusal, memberDebt } from "./debts.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, Repositories, UnitOfWork } from "./ports.ts";

/** How many bets the website lists: the open ones, then the latest closed. */
export const BETS_LISTED = 30;

const UNKNOWN_BET = "Ce pari n'existe pas.";

/** A bet as everybody sees it: its stakes, its pool and odds, and whether stakes are still taken. */
export interface BetView {
  bet: Bet;
  stakes: Stake[];
  book: BetBook;
  open: boolean;
}

/**
 * Ends a bet: with its winning choice, the stakes are settled and the organisation's share goes to the guild's cash
 * (recorded by the member who ends it, with the reason); without one, every stake is given back.
 */
export async function settleBet(
  repositories: Repositories,
  bet: Bet,
  stakes: readonly Stake[],
  winningChoiceId: string | undefined,
  { recordedBy, reason, now }: { recordedBy: string; reason: string; now: Date },
): Promise<Settlement> {
  const settlement = winningChoiceId === undefined ? refund(stakes) : settle(stakes, winningChoiceId);
  await repositories.bets.end(bet.id, winningChoiceId, now);
  await repositories.stakes.settle(settlement.stakes);
  if (settlement.organisation > 0) {
    await repositories.cash.record(
      {
        kind: "bet_share",
        amount: settlement.organisation,
        label: `Pari « ${bet.title} » : part de l'organisation`,
        reason,
        recordedBy,
        betId: bet.id,
        memberId: undefined,
      },
      now,
    );
  }
  return settlement;
}

export function createBets({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  function view(bet: Bet, stakes: Stake[], now: Date): BetView {
    return { bet, stakes, book: betBook(bet, stakes), open: isOpen(bet, now) };
  }

  async function findView({ bets, stakes }: Repositories, betId: string): Promise<BetView | undefined> {
    const bet = await bets.findById(betId);
    return bet && view(bet, await stakes.listByBet(bet.id), clock());
  }

  async function requireView(repositories: Repositories, betId: string): Promise<BetView> {
    const found = await findView(repositories, betId);
    if (found === undefined) {
      throw new ValidationError(UNKNOWN_BET);
    }
    return found;
  }

  /**
   * An officer ends the bet: with its winning choice, the stakes are settled and the organisation's share goes to
   * the guild's cash; without one, the bet is cancelled and every stake is given back.
   */
  async function end(officer: Member, betId: string, winningChoiceId: string | undefined, reason: string) {
    const motive = checkOfficerAction(officer, reason);
    await unitOfWork.run(async (repositories) => {
      const { bet, stakes, book } = await requireView(repositories, betId);
      const refusal = endRefusal(bet, winningChoiceId);
      if (refusal !== undefined) {
        throw new ValidationError(refusal);
      }
      const settlement = await settleBet(repositories, bet, stakes, winningChoiceId, {
        recordedBy: officer.id,
        reason: motive,
        now: clock(),
      });
      const after: BetEndRecord = {
        title: bet.title,
        winner: bet.choices.find((choice) => choice.id === winningChoiceId)?.label,
        pool: book.pool,
        winners: settlement.stakes.filter((stake) => stake.outcome === "won").length,
        organisation: settlement.organisation,
      };
      await repositories.journal.record({
        actorId: officer.id,
        action: winningChoiceId === undefined ? "bet.cancel" : "bet.result",
        entity: "bet",
        entityId: bet.id,
        before: null,
        after,
        reason: motive,
      });
    });
  }

  return {
    /** An officer opens a bet: its title, its choices and when it closes. */
    async create(officer: Member, input: NewBet, reason: string): Promise<string> {
      const motive = checkOfficerAction(officer, reason);
      const bet: NewBet = { title: input.title.trim(), choices: cleanChoices(input.choices), closesAt: input.closesAt };
      const now = clock();
      const refusal = newBetRefusal(bet, now);
      if (refusal !== undefined) {
        throw new ValidationError(refusal);
      }
      return unitOfWork.run(async ({ bets, journal }) => {
        const betId = await bets.create(bet, officer.id, now);
        const after: BetCreationRecord = {
          title: bet.title,
          choices: bet.choices,
          closesAt: bet.closesAt.toISOString(),
        };
        await journal.record({
          actorId: officer.id,
          action: "bet.create",
          entity: "bet",
          entityId: betId,
          before: null,
          after,
          reason: motive,
        });
        return betId;
      });
    },

    /** The open bets, closing soonest first, then the closed ones, latest first. */
    async list(): Promise<BetView[]> {
      const now = clock();
      const views = await unitOfWork.run(async ({ bets, stakes }) => {
        const listed = await bets.listRecent(BETS_LISTED);
        const all = await stakes.listByBets(listed.map((bet) => bet.id));
        return listed.map((bet) =>
          view(
            bet,
            all.filter((stake) => stake.betId === bet.id),
            now,
          ),
        );
      });
      const open = views.filter((entry) => entry.open).reverse();
      return [...open, ...views.filter((entry) => !entry.open)];
    },

    find(betId: string): Promise<BetView | undefined> {
      return unitOfWork.run((repositories) => findView(repositories, betId));
    },

    /** The member stakes on a choice, or moves their stake to this choice and amount, while the bet is open. */
    async stake(member: Member, betId: string, choiceId: string, amount: number): Promise<BetView> {
      return unitOfWork.run(async (repositories) => {
        const now = clock();
        const { bet, stakes } = await requireView(repositories, betId);
        const existing = stakes.find((stake) => stake.memberId === member.id);
        const refusal = stakeRefusal(bet, { choiceId, amount, existing }, now);
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        const duel = await repositories.duels.findByBet(bet.id);
        if (duel !== undefined && isDuelist(duel, member.id)) {
          throw new ValidationError(DUELIST_STAKE);
        }
        if (!canGamble(member.roles)) {
          throw new ValidationError(GAMBLE_REFUSAL);
        }
        const debt = await memberDebt(repositories, member.id);
        if (debt > 0) {
          throw new ValidationError(debtRefusal(debt));
        }
        await repositories.stakes.save({ betId: bet.id, memberId: member.id, choiceId, amount }, now);
        return requireView(repositories, bet.id);
      });
    },

    /** An officer declares the winning choice: gains for the winners, the organisation's share for the cash. */
    declareResult(officer: Member, betId: string, winningChoiceId: string, reason: string): Promise<void> {
      return end(officer, betId, winningChoiceId, reason);
    },

    /** An officer cancels the bet: every stake is given back. */
    cancel(officer: Member, betId: string, reason: string): Promise<void> {
      return end(officer, betId, undefined, reason);
    },

    /** The member takes their stake back, while the bet is open and the stake not paid. */
    async withdraw(member: Member, betId: string): Promise<BetView> {
      return unitOfWork.run(async (repositories) => {
        const { bet, stakes } = await requireView(repositories, betId);
        const existing = stakes.find((stake) => stake.memberId === member.id);
        if (existing === undefined) {
          throw new ValidationError("Tu n'as pas de mise sur ce pari.");
        }
        const refusal = stakeRefusal(bet, { choiceId: existing.choiceId, amount: existing.amount, existing }, clock());
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        await repositories.stakes.delete(bet.id, member.id);
        return requireView(repositories, bet.id);
      });
    },
  };
}

export type Bets = ReturnType<typeof createBets>;
