import { fullName } from "../domain/characters.ts";
import { chifoumiLoser, chifoumiRefusal, parseChifoumi } from "../domain/chifoumis.ts";
import type { Member } from "../domain/members.ts";
import { gameDebts, loserOf, settlePair, winnerOf } from "./debts.ts";
import { gamePlayers, placeGuildBet } from "./diceGames.ts";
import { ValidationError } from "./errors.ts";
import type { Clock, GamePlayer, StoredChifoumi, UnitOfWork } from "./ports.ts";

/** How many games the website lists. */
const CHIFOUMIS_LISTED = 30;

const UNKNOWN = "Ce Chi Fou Mi n'existe pas.";
const KNOWN = "Chi Fou Mi déjà connu.";
/** The end of a game's message when the debts between its players cancel out. */
const SETTLED = " : leurs dettes s'annulent";
const PAID = "Paiement du Chi Fou Mi confirmé.";

/** A game with its winner and loser. */
export interface ChifoumiView {
  game: StoredChifoumi;
  winner: GamePlayer;
  loser: GamePlayer;
}

function view(game: StoredChifoumi): ChifoumiView {
  return { game, winner: winnerOf(game), loser: loserOf(game) };
}

/** The Chi Fou Mi (owner's request of 14 October): the games played in game, their debts until paid. */
export function createChifoumis({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  /** A game sent by a companion: kept once, with its bet, its players' debts settled when they cancel out; or the
   * payment confirmed by the one owed. */
  async function receiveOne(sender: Member, text: string): Promise<string> {
    const game = parseChifoumi(text);
    const refusal = chifoumiRefusal(game);
    if (refusal !== undefined) {
      throw new ValidationError(refusal);
    }
    const now = clock();
    const outcome = await unitOfWork.run(async (repositories) => {
      const players = await gamePlayers(repositories, game, sender);
      const { challenger, challenged, officer } = players;
      const loser = chifoumiLoser(game) === game.challenger ? challenger : challenged;
      const winner = loser === challenger ? challenged : challenger;
      const created = (await repositories.chifoumis.find(game.id)) === undefined;
      if (created) {
        await repositories.chifoumis.save(
          {
            id: game.id,
            challengerId: challenger.id,
            challengedId: challenged.id,
            stake: game.stake,
            acceptedAt: game.acceptedAt,
            endedAt: game.endedAt,
            loserId: loser.id,
            betId: await placeGuildBet(
              repositories,
              { ...game, title: `Chi Fou Mi : ${game.challenger} vs ${game.challenged}`, winner: fullName(winner) },
              players,
              sender,
              now,
            ),
            rounds: game.rounds,
          },
          sender.id,
          now,
        );
      }
      // Debts that cancel out are settled; else the confirmation of the one owed, from their companion or relayed by
      // an officer, settles them.
      const settled = created && (await settlePair(repositories.chifoumis, game.id, now));
      const creditor = game.paid === undefined ? undefined : players.byName.get(game.paid.by)?.memberId;
      const confirmed =
        !settled &&
        game.paid !== undefined &&
        creditor !== undefined &&
        (officer || sender.id === creditor) &&
        (await settlePair(repositories.chifoumis, game.id, game.paid.at, creditor));
      return { created, settled, confirmed, winner: fullName(winner), loser: fullName(loser) };
    });
    if (outcome.confirmed) {
      return PAID;
    }
    return outcome.created
      ? `Chi Fou Mi ${outcome.winner} contre ${outcome.loser} enregistré${outcome.settled ? SETTLED : ""}.`
      : KNOWN;
  }

  return {
    /**
     * Games sent by companions, one VXV-CHIFOUMI text each: by a player, or relayed by an officer. A game is kept
     * once, with the bet the guild placed on it; the winner's confirmation ends the loser's debt. Returns what became
     * of each, in French; a text that cannot be read throws its problems.
     */
    async recordFromGame(sender: Member, texts: readonly string[]): Promise<string[]> {
      const messages: string[] = [];
      for (const text of texts) {
        messages.push(await receiveOne(sender, text));
      }
      return messages;
    },

    /** The winner confirms on the website that the loser paid. */
    async confirmPayment(member: Member, chifoumiId: string): Promise<void> {
      await unitOfWork.run(async ({ chifoumis }) => {
        const game = await chifoumis.find(chifoumiId);
        if (game === undefined) {
          throw new ValidationError(UNKNOWN);
        }
        if (game.paidAt !== undefined) {
          throw new ValidationError("Ce paiement est déjà confirmé.");
        }
        if (!(await settlePair(chifoumis, game.id, clock(), member.id))) {
          throw new ValidationError("Seul celui à qui la dette est due confirme le paiement.");
        }
      });
    },

    /** The latest games, with their winner and loser. */
    async list(): Promise<ChifoumiView[]> {
      return unitOfWork.run(async ({ chifoumis }) => (await chifoumis.listAll()).slice(0, CHIFOUMIS_LISTED).map(view));
    },

    /** The member's debts: the games they lost unpaid, those whose payment they confirm, and all of them. */
    async debtsOf(member: Member) {
      return unitOfWork.run(async ({ chifoumis }) => gameDebts((await chifoumis.listAll()).map(view), member.id));
    },
  };
}

export type Chifoumis = ReturnType<typeof createChifoumis>;
