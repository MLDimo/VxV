import { debtOf } from "../domain/bets.ts";
import { formatGold } from "../domain/labels.ts";
import type { Repositories, StoredDeathroll } from "./ports.ts";

/** The deathroll's loser, as one of its players. */
export function loserOf(game: StoredDeathroll) {
  return game.challenger.characterId === game.loserCharacterId ? game.challenger : game.challenged;
}

/** The deathroll's winner, as one of its players. */
export function winnerOf(game: StoredDeathroll) {
  return game.challenger.characterId === game.loserCharacterId ? game.challenged : game.challenger;
}

/**
 * What a member owes in all (P11.6, P15.6): the stakes they lost without paying them to the treasurer, and the
 * deathrolls they lost whose winner has not confirmed the payment. Any debt bars bets and deathrolls.
 */
export async function memberDebt(repositories: Repositories, memberId: string): Promise<number> {
  const bets = debtOf(await repositories.stakes.listByMember(memberId));
  const deathrolls = (await repositories.deathrolls.listAll())
    .filter((game) => game.paidAt === undefined && loserOf(game).memberId === memberId)
    .reduce((total, game) => total + game.stake, 0);
  return bets + deathrolls;
}

/** Why a member with a debt cannot bet nor play a deathroll. */
export function debtRefusal(debt: number): string {
  return `Tu dois ${formatGold(debt)} (paris ou deathroll) : règle ta dette pour jouer de nouveau.`;
}
