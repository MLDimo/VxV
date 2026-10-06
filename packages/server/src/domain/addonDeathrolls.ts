import { addonHead, line, seconds, text, type AddonReaders } from "./addonText.ts";

/** First line of the deathrolls' data for the addon (contract with VXV_Deathroll); the number is its version. */
export const ADDON_DEATHROLLS_HEADER = "VXV-DEATHROLLS-1";

/** How many players of the ranking, and of the latest games, the addon shows. */
export const ADDON_DEATHROLLS_SHOWN = 10;

interface Player {
  memberId: string | undefined;
  name: string;
}

export interface AddonDeathrollsFacts extends AddonReaders {
  /** The members in debt (bets or deathrolls): barred from both. */
  barred: readonly string[];
  /** The games over, the latest first, with their winner and loser. */
  games: readonly { id: string; winner: Player; loser: Player; stake: number; endedAt: Date; paid: boolean }[];
  ranking: readonly {
    rank: number;
    memberName: string;
    memberClass: string | undefined;
    net: number;
    games: number;
    biggestWin: number;
  }[];
}

/**
 * The deathrolls as the companion hands them to the addon, one record per line, after the head of every bundle's
 * data (addonHead: P, O and M):
 * X;member id (in debt: barred from deathrolls and bets)
 * D;game id;loser's member id;loser;winner's member id;winner;stake;ended (Unix seconds) (the games not paid yet)
 * K;rank;member;class token, empty without main;net gain;games;biggest win (the ranking since always)
 * H;game id;winner;loser;stake;ended (Unix seconds) (the latest games)
 */
export function formatAddonDeathrolls(facts: AddonDeathrollsFacts): string {
  return [
    ...addonHead(ADDON_DEATHROLLS_HEADER, facts),
    ...facts.barred.map((memberId) => line("X", memberId)),
    ...facts.games
      .filter((game) => !game.paid)
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
    ...facts.ranking
      .slice(0, ADDON_DEATHROLLS_SHOWN)
      .map((row) =>
        line("K", row.rank, text(row.memberName), row.memberClass ?? "", row.net, row.games, row.biggestWin),
      ),
    ...facts.games
      .slice(0, ADDON_DEATHROLLS_SHOWN)
      .map((game) => line("H", game.id, game.winner.name, game.loser.name, game.stake, seconds(game.endedAt))),
  ].join("\n");
}
