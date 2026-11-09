import { fullName } from "../domain/characters.ts";
import { BIG_STAKE, deathrollLoser, deathrollRefusal, parseDeathroll } from "../domain/deathrolls.ts";
import type { Member } from "../domain/members.ts";
import { gameDebts, loserOf, settlePair, winnerOf } from "./debts.ts";
import { gamePlayers, placeGuildBet } from "./diceGames.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, GamePlayer, StoredDeathroll, UnitOfWork } from "./ports.ts";
import type { DeathrollAnnouncer } from "./discordPorts.ts";

/** How many games the website lists. */
const DEATHROLLS_LISTED = 30;

const UNKNOWN_DEATHROLL = "Ce deathroll n'existe pas.";
const KNOWN = "Deathroll déjà connu.";
/** The end of a game's message when the debts between its players cancel out. */
const SETTLED = " : leurs dettes s'annulent";
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
  /** A game sent by a companion: kept once, with its bet, its players' debts settled when they cancel out; or the
   * payment confirmed by the one owed. */
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
      // Debts that cancel out are settled; else the confirmation of the one owed, from their companion or relayed by
      // an officer, settles them.
      const settled = created && (await settlePair(repositories.deathrolls, game.id, now));
      const creditor = game.paid === undefined ? undefined : players.byName.get(game.paid.by)?.memberId;
      const confirmed =
        !settled &&
        game.paid !== undefined &&
        creditor !== undefined &&
        (officer || sender.id === creditor) &&
        (await settlePair(repositories.deathrolls, game.id, game.paid.at, creditor));
      return { created, settled, confirmed, winner: fullName(winner), loser: fullName(loser) };
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
    return outcome.created
      ? `Deathroll ${outcome.winner} contre ${outcome.loser} enregistré${outcome.settled ? SETTLED : ""}.`
      : KNOWN;
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
        if (game.paidAt !== undefined) {
          throw new ValidationError("Ce paiement est déjà confirmé.");
        }
        if (!(await settlePair(deathrolls, game.id, clock(), member.id))) {
          throw new ValidationError("Seul celui à qui la dette est due confirme le paiement.");
        }
      });
    },

    /** The latest games, with their winner and loser. */
    async list(): Promise<DeathrollView[]> {
      return unitOfWork.run(async ({ deathrolls }) =>
        (await deathrolls.listAll()).slice(0, DEATHROLLS_LISTED).map(view),
      );
    },

    /** The member's debts: the games they lost unpaid, those whose payment they confirm, and all of them. */
    async debtsOf(member: Member) {
      return unitOfWork.run(async ({ deathrolls }) => gameDebts((await deathrolls.listAll()).map(view), member.id));
    },
  };
}
