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

/** A player of the games: their member, else their character linked to nobody. */
const playerKey = (player: GamePlayer) => player.memberId ?? `character:${player.characterId}`;

/** What two players owe each other in one game (owner's request of 9 November): their unpaid games set against each
 * other, the difference owed by one to the other. */
export interface PairDebt<G extends PlayedGame> {
  debtor: GamePlayer;
  creditor: GamePlayer;
  /** What the debtor owes once both sides are set against each other: 0 when they cancel out. */
  amount: number;
  /** Their unpaid games with a stake, the latest first. */
  games: G[];
}

/** The debts between the players of these games (the latest first), pair by pair. */
export function pairDebts<G extends PlayedGame>(games: readonly G[]): PairDebt<G>[] {
  interface Pair {
    players: Map<string, GamePlayer>;
    lost: Map<string, number>;
    games: G[];
  }
  const pairs = new Map<string, Pair>();
  for (const game of games) {
    if (game.paidAt !== undefined || game.stake === 0) {
      continue;
    }
    const loser = loserOf(game);
    const winner = winnerOf(game);
    const key = [playerKey(loser), playerKey(winner)].sort().join("|");
    const pair: Pair = pairs.get(key) ?? { players: new Map(), lost: new Map(), games: [] };
    for (const player of [loser, winner]) {
      if (!pair.players.has(playerKey(player))) {
        pair.players.set(playerKey(player), player);
      }
    }
    pair.lost.set(playerKey(loser), (pair.lost.get(playerKey(loser)) ?? 0) + game.stake);
    pair.games.push(game);
    pairs.set(key, pair);
  }
  return [...pairs.values()].flatMap((pair) => {
    const [first, second] = [...pair.players.values()];
    if (first === undefined || second === undefined) {
      return [];
    }
    const firstOwes = (pair.lost.get(playerKey(first)) ?? 0) - (pair.lost.get(playerKey(second)) ?? 0);
    return [
      firstOwes >= 0
        ? { debtor: first, creditor: second, amount: firstOwes, games: pair.games }
        : { debtor: second, creditor: first, amount: -firstOwes, games: pair.games },
    ];
  });
}

/** What the member owes in these games, once each pair's debts are set against each other. */
function owed(games: readonly PlayedGame[], memberId: string): number {
  return pairDebts(games)
    .filter((pair) => pair.debtor.memberId === memberId)
    .reduce((total, pair) => total + pair.amount, 0);
}

/** A game's repository, as the debts between its players need it. */
interface GameBook {
  listAll(): Promise<PlayedGame[]>;
  markPaid(id: string, at: Date): Promise<boolean>;
}

/**
 * Settles the debts between the players of a game: all their unpaid games are paid when their debts cancel out, or
 * when the one they are owed to confirms the payment (creditorId, their member). True when settled.
 */
export async function settlePair(book: GameBook, gameId: string, at: Date, creditorId?: string): Promise<boolean> {
  const pair = pairDebts(await book.listAll()).find((candidate) => candidate.games.some((game) => game.id === gameId));
  if (pair === undefined || (pair.amount > 0 && (creditorId === undefined || pair.creditor.memberId !== creditorId))) {
    return false;
  }
  for (const game of pair.games) {
    await book.markPaid(game.id, at);
  }
  return true;
}

/**
 * What a member owes in all (P11.6, P15.6): the stakes they lost without paying them to the treasurer, and in the
 * deathrolls and the Chi Fou Mi what they owe each other player, their games set against each other, until it is
 * paid. From DEBT_LIMIT on, it bars bets and games.
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

/** What a member owes another, or is owed, in one game: a game of theirs (to confirm the payment) and the amount. */
export interface DebtView {
  id: string;
  debtor: GamePlayer;
  creditor: GamePlayer;
  amount: number;
}

/**
 * A member's debts in one game's list, the games being the latest first (P15.6): what they owe each player and what
 * each owes them, their games set against each other, and the history of all their games with a stake, paid or not.
 */
export function gameDebts<G extends PlayedGame>(views: readonly GameView<G>[], memberId: string) {
  const pairs = pairDebts(views.map((view) => view.game))
    .filter((pair) => pair.amount > 0)
    .map((pair) => ({
      id: pair.games[0]?.id ?? "",
      debtor: pair.debtor,
      creditor: pair.creditor,
      amount: pair.amount,
    }));
  return {
    owed: pairs.filter((pair) => pair.debtor.memberId === memberId),
    toConfirm: pairs.filter((pair) => pair.creditor.memberId === memberId),
    history: views
      .filter((view) => view.game.stake > 0 && (view.loser.memberId === memberId || view.winner.memberId === memberId))
      .slice(0, DEBTS_LISTED),
  };
}
