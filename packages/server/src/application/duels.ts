import type { Bet } from "../domain/bets.ts";
import { fullName } from "../domain/characters.ts";
import {
  answerRefusal,
  cancelRefusal,
  duelStatus,
  eloRatings,
  newDuelRefusal,
  opponentOf,
  resultRefusal,
  type Duel,
  type DuelStatus,
  type NewDuel,
} from "../domain/duels.ts";
import type { DuelRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { settleBet } from "./bets.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, MemberLook, Repositories, UnitOfWork } from "./ports.ts";

const UNKNOWN_DUEL = "Ce duel n'existe pas.";
const UNKNOWN_OPPONENT = "Ce joueur n'est pas membre de la guilde.";
/** How many ended duels the website lists, after the ones to come. */
const ENDED_DUELS_LISTED = 20;

/** A duel as the website and the addon show it: its players by their main character, and where it stands. */
export interface DuelView {
  duel: Duel;
  status: DuelStatus;
  challenger: MemberLook;
  opponent: MemberLook;
}

/** A duelist's line in the Elo ranking. */
export interface DuelRankingLine {
  rank: number;
  member: MemberLook;
  /** Rounded. */
  rating: number;
  played: number;
  won: number;
}

interface Announcements {
  announceQuietly(id: string): Promise<boolean>;
}

/** A member as the duels show them (by their main character, else their Discord name). */
function lookOf(looks: readonly MemberLook[], memberId: string): MemberLook {
  return (
    looks.find((look) => look.memberId === memberId) ?? {
      memberId,
      name: "Membre parti",
      characterClass: undefined,
      race: undefined,
      sex: undefined,
    }
  );
}

function viewOf(duel: Duel, looks: readonly MemberLook[]): DuelView {
  return {
    duel,
    status: duelStatus(duel),
    challenger: lookOf(looks, duel.challengerId),
    opponent: lookOf(looks, duel.opponentId),
  };
}

async function requireDuel(repositories: Repositories, duelId: string): Promise<Duel> {
  const duel = await repositories.duels.findById(duelId);
  if (duel === undefined) {
    throw new ValidationError(UNKNOWN_DUEL);
  }
  return duel;
}

function refuseIf(refusal: string | undefined): void {
  if (refusal !== undefined) {
    throw new ValidationError(refusal);
  }
}

/**
 * Ends the duel's bet, if it has one still running: the winner's choice wins (the challenger's is the first), or every
 * stake comes back when the duel is called off.
 */
async function endBet(
  repositories: Repositories,
  duel: Duel,
  winnerId: string | undefined,
  recordedBy: string,
  now: Date,
): Promise<void> {
  const bet: Bet | undefined = duel.betId === undefined ? undefined : await repositories.bets.findById(duel.betId);
  if (bet === undefined || bet.endedAt !== undefined) {
    return;
  }
  const choice = winnerId === undefined ? undefined : bet.choices[winnerId === duel.challengerId ? 0 : 1]?.id;
  await settleBet(repositories, bet, await repositories.stakes.listByBet(bet.id), choice, {
    recordedBy,
    reason: winnerId === undefined ? "Duel annulé." : "Duel joué.",
    now,
  });
}

/** The duels (owner's request of 7 October): challenges, the guild's bets on them, their results and the Elo. */
export function createDuels({
  unitOfWork,
  clock,
  announcements,
  betAnnouncements,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  /** Each duel's message on Discord. */
  announcements: Announcements;
  /** The message of a duel's bet. */
  betAnnouncements: Announcements;
}) {
  /** Refreshes the duel's message, and its bet's. */
  async function announce(duel: Pick<Duel, "id" | "betId">): Promise<void> {
    await announcements.announceQuietly(duel.id);
    if (duel.betId !== undefined) {
      await betAnnouncements.announceQuietly(duel.betId);
    }
  }

  /**
   * Records the winner and settles the bet: told by the loser (no reason), or by an officer, whose reason goes to the
   * journal.
   */
  async function record(
    member: Member,
    duelId: string,
    winnerOf: (duel: Duel, repositories: Repositories) => string | Promise<string>,
    officerReason: string | undefined,
  ): Promise<void> {
    const duel = await unitOfWork.run(async (repositories) => {
      const found = await requireDuel(repositories, duelId);
      const winnerId = await winnerOf(found, repositories);
      // Told twice (both players' addons read the game's message): the first one stands.
      if (found.winnerId === winnerId) {
        return undefined;
      }
      refuseIf(resultRefusal(found, winnerId, officerReason === undefined ? member.id : undefined));
      const now = clock();
      await repositories.duels.recordWinner(found.id, winnerId, now);
      await endBet(repositories, found, winnerId, member.id, now);
      if (officerReason !== undefined) {
        await journalDuel(repositories, member, found, "duel.result", officerReason, winnerId);
      }
      return found;
    });
    if (duel !== undefined) {
      await announce(duel);
    }
  }

  return {
    /** The member challenges another to a duel at a time and a place; the opponent is called on Discord. */
    async challenge(member: Member, input: NewDuel): Promise<string> {
      const now = clock();
      refuseIf(newDuelRefusal(member.id, input, now));
      const duelId = await unitOfWork.run(async ({ members, duels }) => {
        if ((await members.findById(input.opponentId)) === undefined) {
          throw new ValidationError(UNKNOWN_OPPONENT);
        }
        return duels.create(member.id, input, now);
      });
      await announcements.announceQuietly(duelId);
      return duelId;
    },

    /** The opponent takes up the challenge, which opens the guild's bet on it until its time, or turns it down. */
    async answer(member: Member, duelId: string, accept: boolean): Promise<void> {
      const duel = await unitOfWork.run(async (repositories) => {
        const found = await requireDuel(repositories, duelId);
        const now = clock();
        refuseIf(answerRefusal(found, member.id, now));
        let betId: string | undefined;
        if (accept) {
          const looks = await repositories.members.listLooks();
          const players = [lookOf(looks, found.challengerId).name, lookOf(looks, found.opponentId).name];
          betId = await repositories.bets.create(
            { title: `Duel : ${players.join(" contre ")}`, choices: players, closesAt: found.scheduledAt },
            member.id,
            now,
          );
        }
        await repositories.duels.answer(found.id, accept, now, betId);
        return { ...found, betId };
      });
      await announce(duel);
    },

    /** A duelist calls the duel off before it is played: the stakes on it come back. */
    async cancel(member: Member, duelId: string): Promise<void> {
      const duel = await unitOfWork.run(async (repositories) => {
        const found = await requireDuel(repositories, duelId);
        refuseIf(cancelRefusal(found, member.id));
        const now = clock();
        await repositories.duels.cancel(found.id, now);
        await endBet(repositories, found, undefined, member.id, now);
        return found;
      });
      await announce(duel);
    },

    /** The loser concedes the duel, when the game could not tell it: the other player wins. */
    concede(member: Member, duelId: string): Promise<void> {
      return record(member, duelId, (duel) => opponentOf(duel, member.id), undefined);
    },

    /**
     * The result the game showed a duelist (« Prénom Nom a vaincu Prénom Nom en duel »), sent by their addon: the
     * characters must be the duelists'.
     */
    recordFromGame(member: Member, duelId: string, winner: string, loser: string): Promise<void> {
      return record(
        member,
        duelId,
        async (duel, { characters }) => {
          const byName = new Map((await characters.listAll()).map((character) => [fullName(character), character]));
          const winnerId = byName.get(winner)?.memberId;
          const loserId = byName.get(loser)?.memberId;
          if (winnerId === undefined || loserId !== opponentOf(duel, winnerId)) {
            throw new ValidationError("Ce résultat ne correspond pas aux joueurs du duel.");
          }
          return winnerId;
        },
        undefined,
      );
    },

    /** An officer records the winner of a duel the players do not settle, with a reason in the journal. */
    async recordAsOfficer(officer: Member, duelId: string, winnerId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await record(officer, duelId, () => winnerId, motive);
    },

    /** An officer calls a duel off, with a reason in the journal: the stakes on it come back. */
    async cancelAsOfficer(officer: Member, duelId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      const duel = await unitOfWork.run(async (repositories) => {
        const found = await requireDuel(repositories, duelId);
        refuseIf(cancelRefusal(found, undefined));
        const now = clock();
        await repositories.duels.cancel(found.id, now);
        await endBet(repositories, found, undefined, officer.id, now);
        await journalDuel(repositories, officer, found, "duel.cancel", motive, undefined);
        return found;
      });
      await announce(duel);
    },

    /** The duels to come (soonest first), then the latest ended. */
    async list(): Promise<DuelView[]> {
      const { duels, looks } = await unitOfWork.run(async ({ duels: stored, members }) => ({
        duels: await stored.listAll(),
        looks: await members.listLooks(),
      }));
      const views = duels.map((duel) => viewOf(duel, looks));
      const coming = views.filter((view) => view.status === "proposed" || view.status === "scheduled").reverse();
      return [...coming, ...views.filter((view) => !coming.includes(view)).slice(0, ENDED_DUELS_LISTED)];
    },

    find(duelId: string): Promise<DuelView | undefined> {
      return unitOfWork.run(async ({ duels, members }) => {
        const duel = await duels.findById(duelId);
        return duel && viewOf(duel, await members.listLooks());
      });
    },

    /** The Elo ranking of the duelists, from every duel played. */
    async ranking(): Promise<DuelRankingLine[]> {
      const { duels, looks } = await unitOfWork.run(async ({ duels: stored, members }) => ({
        duels: await stored.listAll(),
        looks: await members.listLooks(),
      }));
      const outcomes = duels.flatMap((duel) =>
        duel.winnerId === undefined || duel.playedAt === undefined
          ? []
          : [{ winnerId: duel.winnerId, loserId: opponentOf(duel, duel.winnerId), playedAt: duel.playedAt }],
      );
      return eloRatings(outcomes).map((line, index) => ({
        rank: index + 1,
        member: lookOf(looks, line.memberId),
        rating: Math.round(line.rating),
        played: line.played,
        won: line.won,
      }));
    },
  };
}

/** An officer's settling of a duel, in the journal. */
async function journalDuel(
  repositories: Repositories,
  officer: Member,
  duel: Duel,
  action: "duel.result" | "duel.cancel",
  reason: string,
  winnerId: string | undefined,
): Promise<void> {
  const looks = await repositories.members.listLooks();
  const after: DuelRecord = {
    challenger: lookOf(looks, duel.challengerId).name,
    opponent: lookOf(looks, duel.opponentId).name,
    scheduledAt: duel.scheduledAt.toISOString(),
    ...(winnerId === undefined ? {} : { winner: lookOf(looks, winnerId).name }),
  };
  await repositories.journal.record({
    actorId: officer.id,
    action,
    entity: "duel",
    entityId: duel.id,
    before: null,
    after,
    reason,
  });
}

export type Duels = ReturnType<typeof createDuels>;
