import { DEBT_LIMIT, debtOf } from "../domain/bets.ts";
import type { RankedGame } from "../domain/diceGames.ts";
import { formatGold } from "../domain/labels.ts";
import type { GamePlayer, PlayedGame, Repositories } from "./ports.ts";

/** How many of a member's debts their history lists, the latest first. */
const DEBTS_LISTED = 20;

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
 * deathrolls and Chi Fou Mi they lost whose winner has not confirmed the payment. From DEBT_LIMIT on, it bars bets
 * and games.
 */
export async function memberDebt(repositories: Repositories, memberId: string): Promise<number> {
  const bets = debtOf(await repositories.stakes.listByMember(memberId));
  return (
    bets +
    owed(await repositories.deathrolls.listAll(), memberId) +
    owed(await repositories.chifoumis.listAll(), memberId)
  );
}

/** Why a member owing too much cannot bet nor play. */
export function debtRefusal(debt: number): string {
  return (
    `Tu dois ${formatGold(debt)} (paris, deathroll ou Chi Fou Mi) : ` +
    `ramène ta dette sous ${formatGold(DEBT_LIMIT)} pour jouer de nouveau.`
  );
}

/** A game of Le Dé Pipé with its winner and loser, as the pages show it. */
interface GameView<G extends PlayedGame> {
  game: G;
  winner: GamePlayer;
  loser: GamePlayer;
}

/**
 * A member's debts in one game's list, the games being the latest first (P15.6): those they owe, those whose payment
 * they have to confirm, and the history of all their games with a stake, paid or not.
 */
export function gameDebts<G extends PlayedGame>(views: readonly GameView<G>[], memberId: string) {
  const debts = views.filter(
    (view) => view.game.stake > 0 && (view.loser.memberId === memberId || view.winner.memberId === memberId),
  );
  const unpaid = debts.filter((view) => view.game.paidAt === undefined);
  return {
    owed: unpaid.filter((view) => view.loser.memberId === memberId),
    toConfirm: unpaid.filter((view) => view.winner.memberId === memberId),
    history: debts.slice(0, DEBTS_LISTED),
  };
}
