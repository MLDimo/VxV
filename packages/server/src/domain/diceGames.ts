/**
 * What Le Dé Pipé's games share, the deathroll (P15) and the Chi Fou Mi: one against one in game, the guild betting
 * on a player during the minute after the acceptance, the loser owing the stake to the winner until the payment is
 * confirmed.
 */

/** How long the guild bets on a game, between its acceptance and its first move (P15.2). */
export const DICE_BETTING_MS = 60_000;

/** A stake of the guild on a player of a game. */
export interface GameBet {
  bettor: string;
  /** The player chosen, "Prénom Nom". */
  choice: string;
  amount: number;
}

/** The guild's stakes that count (P15.2): on a player, by someone else, of 1 po at least. */
export function guildBets(game: { challenger: string; challenged: string; bets: readonly GameBet[] }): GameBet[] {
  const players = [game.challenger, game.challenged];
  return game.bets.filter((bet) => !players.includes(bet.bettor) && players.includes(bet.choice) && bet.amount >= 1);
}

/** A game over, for the ranking: the members who won and lost it, its stake and when it ended. */
export interface RankedGame {
  winnerId: string;
  loserId: string;
  stake: number;
  endedAt: Date;
}
