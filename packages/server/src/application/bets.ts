import {
  betBook,
  cleanChoices,
  isOpen,
  newBetRefusal,
  stakeRefusal,
  type Bet,
  type BetBook,
  type NewBet,
  type Stake,
} from "../domain/bets.ts";
import type { BetCreationRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
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
        await repositories.stakes.save({ betId: bet.id, memberId: member.id, choiceId, amount }, now);
        return requireView(repositories, bet.id);
      });
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
