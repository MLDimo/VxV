import { debtOf } from "../domain/bets.ts";
import type { RankedGame } from "../domain/diceGames.ts";
import { formatGold } from "../domain/labels.ts";
import type { PlayedGame, Repositories } from "./ports.ts";

/** The game's loser, as one of its players (a deathroll or a Chi Fou Mi). */
export function loserOf(game: PlayedGame) {
  return game.challenger.characterId === game.loserCharacterId ? game.challenger : game.challenged;
}

/** The game's winner, as one of its players. */
export function winnerOf(game: PlayedGame) {
  return game.challenger.characterId === game.loserCharacterId ? game.challenged : game.challenger;
}

/** A game for the rankings and the titles: its players' members, or undefined for a player linked to nobody. */
export function rankedGame(game: PlayedGame): RankedGame | undefined {
  const winnerId = winnerOf(game).memberId;
  const loserId = loserOf(game).memberId;
  return winnerId === undefined || loserId === undefined
    ? undefined
    : { winnerId, loserId, stake: game.stake, endedAt: game.endedAt };
}

/** What the member lost in these games whose winner has not confirmed the payment. */
function owed(games: readonly PlayedGame[], memberId: string): number {
  return games
    .filter((game) => game.paidAt === undefined && loserOf(game).memberId === memberId)
    .reduce((total, game) => total + game.stake, 0);
}

/**
 * What a member owes in all (P11.6, P15.6): the stakes they lost without paying them to the treasurer, and the
 * deathrolls and Chi Fou Mi they lost whose winner has not confirmed the payment. Any debt bars bets and games.
 */
export async function memberDebt(repositories: Repositories, memberId: string): Promise<number> {
  const bets = debtOf(await repositories.stakes.listByMember(memberId));
  return (
    bets +
    owed(await repositories.deathrolls.listAll(), memberId) +
    owed(await repositories.chifoumis.listAll(), memberId)
  );
}

/** Why a member with a debt cannot bet nor play. */
export function debtRefusal(debt: number): string {
  return `Tu dois ${formatGold(debt)} (paris, deathroll ou Chi Fou Mi) : règle ta dette pour jouer de nouveau.`;
}
