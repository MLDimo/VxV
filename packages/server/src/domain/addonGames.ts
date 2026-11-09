import { addonHead, flag, line, seconds, type AddonReaders } from "./addonText.ts";

/** First line of the deathrolls' data for the addon (contract with VXV/Deathroll); the number is its version. */
export const ADDON_DEATHROLLS_HEADER = "VXV-DEATHROLLS-3";

/** First line of the Chi Fou Mi's data for the addon (contract with VXV/Chifoumi); the number is its version. */
export const ADDON_CHIFOUMIS_HEADER = "VXV-CHIFOUMIS-3";

/**
 * How many of the latest games go to the addon: its lists show the first ten, and each player's debts as they stood
 * (paid or not) in all of them; a game it kept is still owed until the website says it is paid.
 */
export const ADDON_GAMES_SENT = 50;

interface Player {
  memberId: string | undefined;
  name: string;
}

/** The data of one of Le Dé Pipé's games for the addon: what each member owes, the games not paid and the latest. */
export interface AddonGamesFacts extends AddonReaders {
  /** What each member owes (bets, deathrolls and Chi Fou Mi), the members who owe nothing left out. */
  debts: readonly { memberId: string; owed: number }[];
  /** From this much owed on, a member is barred from bets and games. */
  debtLimit: number;
  /** The members without the guild's Discord role « Membre »: barred from both too. */
  newcomers: readonly string[];
  /** The members' portraits (packages/design's avatars): the games' windows draw their players with them. */
  portraits: readonly { memberId: string; avatar: string }[];
  /** The games over, the latest first, with their winner and loser. */
  games: readonly { id: string; winner: Player; loser: Player; stake: number; endedAt: Date; paid: boolean }[];
}

/**
 * A game's data as the companion hands them to the addon (VXV-DEATHROLLS, VXV-CHIFOUMIS), one record per line, after
 * the head of every part's data (addonHead: P, O and M):
 * L;debt limit (from this many gold pieces owed on, a member is barred from bets and games)
 * X;member id;owed (what a member owes, bets and games: with the games over since the export, the addon tells who is
 *   barred)
 * N;member id (without the role « Membre » on Discord: barred from games and bets)
 * A;member id;portrait (the games' windows draw their players with it)
 * D;game id;loser's member id;loser;winner's member id;winner;stake;ended (Unix seconds) (the games not paid yet,
 *   with a stake)
 * H;game id;winner;loser;stake;ended (Unix seconds);paid (1, or 0 while the winner has not confirmed it) (the latest
 *   games)
 */
export function formatAddonGames(header: string, facts: AddonGamesFacts): string {
  return [
    ...addonHead(header, facts),
    line("L", facts.debtLimit),
    ...facts.debts.map((debt) => line("X", debt.memberId, debt.owed)),
    ...facts.newcomers.map((memberId) => line("N", memberId)),
    ...facts.portraits.map((portrait) => line("A", portrait.memberId, portrait.avatar)),
    ...facts.games
      .filter((game) => !game.paid && game.stake > 0)
      .map((game) =>
        line(
          "D",
          game.id,
          game.loser.memberId ?? "",
          game.loser.name,
          game.winner.memberId ?? "",
          game.winner.name,
          game.stake,
          seconds(game.endedAt),
        ),
      ),
    ...facts.games
      .slice(0, ADDON_GAMES_SENT)
      .map((game) =>
        line("H", game.id, game.winner.name, game.loser.name, game.stake, seconds(game.endedAt), flag(game.paid)),
      ),
  ].join("\n");
}
