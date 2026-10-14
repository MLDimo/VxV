import { fullName, type Character } from "../domain/characters.ts";
import { DICE_BETTING_MS, guildBets, type GameBet } from "../domain/diceGames.ts";
import type { Member } from "../domain/members.ts";
import { canGamble, canManageRaids } from "../domain/permissions.ts";
import { settleBet } from "./bets.ts";
import { memberDebt } from "./debts.ts";
import { ValidationError } from "./errors.ts";
import type { Repositories } from "./ports.ts";

const NOT_A_PLAYER = "Seuls les joueurs de la partie, ou un officier qui la relaie, peuvent l'envoyer.";
const UNKNOWN_PLAYER = "Un joueur de la partie n'est lié à aucun membre sur le site.";

/** A game of Le Dé Pipé as the addon tells it: its players, "Prénom Nom", and the guild's stakes. */
interface ToldGame {
  challenger: string;
  challenged: string;
  acceptedAt: Date;
  bets: readonly GameBet[];
}

/** The game's players as the website knows them, and the guild's characters by name. */
export interface GamePlayers {
  challenger: Character;
  challenged: Character;
  byName: ReadonlyMap<string, Character>;
  /** Whether the sender is an officer, who may relay any game. */
  officer: boolean;
}

/** The players of a game sent by a companion: each linked to a member, the sender one of them or an officer. */
export async function gamePlayers(repositories: Repositories, game: ToldGame, sender: Member): Promise<GamePlayers> {
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
  return { challenger, challenged, byName, officer };
}

/**
 * The guild's bet on the game (P15.2): the stakes on a player from the members with the role « Membre », neither
 * player nor in debt, settled at once on the winner. Returns the bet's id, or undefined without any stake.
 */
export async function placeGuildBet(
  repositories: Repositories,
  game: ToldGame & { title: string; winner: string },
  players: GamePlayers,
  sender: Member,
  now: Date,
): Promise<string | undefined> {
  const playing = new Set([players.challenger.memberId, players.challenged.memberId]);
  const gamblers = new Set(
    (await repositories.members.listAll()).filter((member) => canGamble(member.roles)).map((member) => member.id),
  );
  const stakes = new Map<string, { choice: string; amount: number }>();
  for (const bet of guildBets(game)) {
    const memberId = players.byName.get(bet.bettor)?.memberId;
    if (memberId === undefined || playing.has(memberId) || stakes.has(memberId) || !gamblers.has(memberId)) {
      continue;
    }
    if ((await memberDebt(repositories, memberId)) === 0) {
      stakes.set(memberId, { choice: bet.choice, amount: bet.amount });
    }
  }
  if (stakes.size === 0) {
    return undefined;
  }
  const closesAt = new Date(game.acceptedAt.getTime() + DICE_BETTING_MS);
  const betId = await repositories.bets.create(
    { title: game.title, choices: [game.challenger, game.challenged], closesAt },
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
  await settleBet(repositories, bet, await repositories.stakes.listByBet(betId), choiceOf(game.winner), {
    recordedBy: sender.id,
    reason: `Pari de la partie « ${game.title} », jouée en jeu.`,
    now,
  });
  return betId;
}
