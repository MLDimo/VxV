import { fullName, type Character } from "../domain/characters.ts";
import { startOfMonth } from "../domain/dateTime.ts";
import {
  BIG_STAKE,
  DEATHROLL_BETTING_MS,
  deathrollBets,
  deathrollLoser,
  deathrollRanking,
  deathrollRefusal,
  parseDeathroll,
  type DeathrollGame,
  type DeathrollRank,
} from "../domain/deathrolls.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import type { RankingPeriod } from "../domain/ranking.ts";
import { settleBet } from "./bets.ts";
import { loserOf, memberDebt, winnerOf } from "./debts.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, DeathrollPlayer, Repositories, Season, StoredDeathroll, UnitOfWork } from "./ports.ts";
import type { DeathrollAnnouncer } from "./discordPorts.ts";

/** How many games the website lists. */
const DEATHROLLS_LISTED = 30;

const UNKNOWN_DEATHROLL = "Ce deathroll n'existe pas.";
const KNOWN = "Deathroll déjà connu.";
const PAID = "Paiement du deathroll confirmé.";
const NOT_A_PLAYER = "Seuls les joueurs de la partie, ou un officier qui la relaie, peuvent l'envoyer.";
const UNKNOWN_PLAYER = "Un joueur de la partie n'est lié à aucun membre sur le site.";

/** A game with its winner and loser. */
export interface DeathrollView {
  game: StoredDeathroll;
  winner: DeathrollPlayer;
  loser: DeathrollPlayer;
}

/** A row of the deathroll's ranking, with the member as shown. */
export interface DeathrollRankRow extends DeathrollRank {
  memberName: string;
  memberClass: string | undefined;
}

export function view(game: StoredDeathroll): DeathrollView {
  return { game, winner: winnerOf(game), loser: loserOf(game) };
}

/** The players of the games ended since the instant, ranked, each shown as their member. */
export function rankDeathrolls(views: readonly DeathrollView[], since: Date | undefined): DeathrollRankRow[] {
  const members = new Map(
    views.flatMap(({ winner, loser }) => [winner, loser]).map((player) => [player.memberId, player]),
  );
  const ranked = views.flatMap(({ game, winner, loser }) =>
    winner.memberId === undefined || loser.memberId === undefined
      ? []
      : [{ winnerId: winner.memberId, loserId: loser.memberId, stake: game.stake, endedAt: game.endedAt }],
  );
  return deathrollRanking(ranked, since).map((row) => ({
    ...row,
    memberName: members.get(row.memberId)?.memberName ?? "",
    memberClass: members.get(row.memberId)?.memberClass,
  }));
}

/** The guild's stake on a player of the game, from a member who is neither player nor in debt. */
async function placeBets(
  repositories: Repositories,
  game: DeathrollGame,
  players: { challenger: Character; challenged: Character },
  byName: ReadonlyMap<string, Character>,
  sender: Member,
  now: Date,
): Promise<string | undefined> {
  const playing = new Set([players.challenger.memberId, players.challenged.memberId]);
  const stakes = new Map<string, { choice: string; amount: number }>();
  for (const bet of deathrollBets(game)) {
    const memberId = byName.get(bet.bettor)?.memberId;
    if (memberId === undefined || playing.has(memberId) || stakes.has(memberId)) {
      continue;
    }
    if ((await memberDebt(repositories, memberId)) === 0) {
      stakes.set(memberId, { choice: bet.choice, amount: bet.amount });
    }
  }
  if (stakes.size === 0) {
    return undefined;
  }
  const closesAt = new Date(game.acceptedAt.getTime() + DEATHROLL_BETTING_MS);
  const betId = await repositories.bets.create(
    {
      title: `Deathroll : ${game.challenger} vs ${game.challenged}`,
      choices: [game.challenger, game.challenged],
      closesAt,
    },
    sender.id,
    now,
  );
  const bet = await repositories.bets.findById(betId);
  if (bet === undefined) {
    return undefined;
  }
  const choiceOf = (label: string) => bet.choices.find((choice) => choice.label === label)?.id ?? "";
  for (const [memberId, stake] of stakes) {
    await repositories.stakes.save(
      { betId, memberId, choiceId: choiceOf(stake.choice), amount: stake.amount },
      closesAt,
    );
  }
  const winner = deathrollLoser(game) === game.challenger ? game.challenged : game.challenger;
  await settleBet(repositories, bet, await repositories.stakes.listByBet(betId), choiceOf(winner), {
    recordedBy: sender.id,
    reason: "Pari du deathroll, joué en jeu.",
    now,
  });
  return betId;
}

/** The deathrolls (P15): the games played in game, their debts until paid, their ranking. */
export function createDeathrolls({
  unitOfWork,
  clock,
  announcer,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  announcer: DeathrollAnnouncer;
}) {
  /** A game sent by a companion: kept once, with its bet; or its payment confirmed by its winner. */
  async function receiveOne(sender: Member, text: string): Promise<string> {
    const game = parseDeathroll(text);
    const refusal = deathrollRefusal(game);
    if (refusal !== undefined) {
      throw new ValidationError(refusal);
    }
    const now = clock();
    const outcome = await unitOfWork.run(async (repositories) => {
      const byName = new Map(
        (await repositories.characters.listAll()).map((character) => [fullName(character), character]),
      );
      const challenger = byName.get(game.challenger);
      const challenged = byName.get(game.challenged);
      if (challenger?.memberId === undefined || challenged?.memberId === undefined) {
        throw new ValidationError(UNKNOWN_PLAYER);
      }
      const officer = canManageRaids(sender.roles);
      if (!officer && sender.id !== challenger.memberId && sender.id !== challenged.memberId) {
        throw new ValidationError(NOT_A_PLAYER);
      }
      const loser = deathrollLoser(game) === game.challenger ? challenger : challenged;
      const winner = loser === challenger ? challenged : challenger;
      const known = await repositories.deathrolls.find(game.id);
      const created = known === undefined;
      if (created) {
        await repositories.deathrolls.save(
          {
            id: game.id,
            challengerId: challenger.id,
            challengedId: challenged.id,
            stake: game.stake,
            start: game.start,
            acceptedAt: game.acceptedAt,
            endedAt: game.endedAt,
            loserId: loser.id,
            betId: await placeBets(repositories, game, { challenger, challenged }, byName, sender, now),
            rolls: game.rolls.map((roll) => ({
              characterId: roll.character === game.challenger ? challenger.id : challenged.id,
              high: roll.high,
              result: roll.result,
            })),
          },
          sender.id,
          now,
        );
      }
      // The winner's confirmation, from the winner's companion or relayed by an officer.
      const confirmed =
        game.paid !== undefined &&
        game.paid.by === fullName(winner) &&
        (officer || sender.id === winner.memberId) &&
        (await repositories.deathrolls.markPaid(game.id, game.paid.at));
      return { created, confirmed, winner: fullName(winner), loser: fullName(loser) };
    });
    if (outcome.created && game.stake >= BIG_STAKE) {
      try {
        await announcer.announce({
          id: game.id,
          winner: outcome.winner,
          loser: outcome.loser,
          stake: game.stake,
          rolls: game.rolls.length,
        });
      } catch (error) {
        console.error("Discord deathroll announcement failed", error);
      }
    }
    if (outcome.confirmed) {
      return PAID;
    }
    return outcome.created ? `Deathroll ${outcome.winner} contre ${outcome.loser} enregistré.` : KNOWN;
  }

  return {
    /**
     * Games sent by companions (P15), one VXV-DEATHROLL text each: by a player, or relayed by an officer. A game is
     * kept once, with the bet the guild placed on it; the winner's confirmation ends the loser's debt. Returns what
     * became of each, in French; a text that cannot be read throws its problems.
     */
    async recordFromGame(sender: Member, texts: readonly string[]): Promise<string[]> {
      const messages: string[] = [];
      for (const text of texts) {
        messages.push(await receiveOne(sender, text));
      }
      return messages;
    },

    /** The winner confirms on the website that the loser paid (P15.6). */
    async confirmPayment(member: Member, deathrollId: string): Promise<void> {
      await unitOfWork.run(async ({ deathrolls }) => {
        const game = await deathrolls.find(deathrollId);
        if (game === undefined) {
          throw new ValidationError(UNKNOWN_DEATHROLL);
        }
        if (winnerOf(game).memberId !== member.id) {
          throw new ValidationError("Seul le gagnant confirme le paiement.");
        }
        if (!(await deathrolls.markPaid(game.id, clock()))) {
          throw new ValidationError("Ce paiement est déjà confirmé.");
        }
      });
    },

    /** The latest games, with their winner and loser. */
    async list(): Promise<DeathrollView[]> {
      return unitOfWork.run(async ({ deathrolls }) =>
        (await deathrolls.listAll()).slice(0, DEATHROLLS_LISTED).map(view),
      );
    },

    /** The member's unpaid games: those they lost, and those they won whose payment they have to confirm. */
    async debtsOf(member: Member): Promise<{ owed: DeathrollView[]; toConfirm: DeathrollView[] }> {
      return unitOfWork.run(async ({ deathrolls }) => {
        const unpaid = (await deathrolls.listAll()).filter((game) => game.paidAt === undefined).map(view);
        return {
          owed: unpaid.filter((game) => game.loser.memberId === member.id),
          toConfirm: unpaid.filter((game) => game.winner.memberId === member.id),
        };
      });
    },

    /** The players of the games ended in the period (P15.7); "season" counts from the current season's start. */
    async ranking(period: RankingPeriod): Promise<{ season: Season | undefined; rows: DeathrollRankRow[] }> {
      return unitOfWork.run(async ({ deathrolls, seasons }) => {
        const season = await seasons.current();
        if (period === "season" && season === undefined) {
          return { season, rows: [] };
        }
        const since = period === "month" ? startOfMonth(clock()) : period === "season" ? season?.startedAt : undefined;
        return { season, rows: rankDeathrolls((await deathrolls.listAll()).map(view), since) };
      });
    },
  };
}
