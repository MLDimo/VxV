import { fullName } from "../domain/characters.ts";
import { BIG_STAKE, deathrollLoser, deathrollRefusal, parseDeathroll } from "../domain/deathrolls.ts";
import type { Member } from "../domain/members.ts";
import { loserOf, winnerOf } from "./debts.ts";
import { gamePlayers, placeGuildBet } from "./diceGames.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, GamePlayer, StoredDeathroll, UnitOfWork } from "./ports.ts";
import type { DeathrollAnnouncer } from "./discordPorts.ts";

/** How many games the website lists. */
const DEATHROLLS_LISTED = 30;

const UNKNOWN_DEATHROLL = "Ce deathroll n'existe pas.";
const KNOWN = "Deathroll déjà connu.";
const PAID = "Paiement du deathroll confirmé.";

/** A game with its winner and loser. */
export interface DeathrollView {
  game: StoredDeathroll;
  winner: GamePlayer;
  loser: GamePlayer;
}

export function view(game: StoredDeathroll): DeathrollView {
  return { game, winner: winnerOf(game), loser: loserOf(game) };
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
      const players = await gamePlayers(repositories, game, sender);
      const { challenger, challenged, officer } = players;
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
            betId: await placeGuildBet(
              repositories,
              { ...game, title: `Deathroll : ${game.challenger} vs ${game.challenged}`, winner: fullName(winner) },
              players,
              sender,
              now,
            ),
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
  };
}
