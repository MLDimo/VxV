import { addonHead, line, text, type AddonReaders } from "./addonText.ts";
import type { RankingPeriod } from "./ranking.ts";
import type { RankingCategory, RankingUnit } from "./rankingBoards.ts";

/** First line of Ranking's data for the addon (contract with VXV_Ranking); the number is the format version. */
export const ADDON_RANKING_HEADER = "VXV-RANKING-1";

/** The first of each board the addon shows: the podium, then the others down to this place. */
const ROWS_PER_BOARD = 25;

/** A member as the addon draws them on the boards. */
export interface AddonRankingMember {
  memberId: string;
  name: string;
  characterClass: string | undefined;
  /** The portrait's file (packages/design's avatars), if any. */
  avatar: string | undefined;
  title: string | undefined;
}

export interface AddonRankingBoard {
  category: RankingCategory;
  period: RankingPeriod;
  metric: string;
  unit: RankingUnit;
  rows: readonly { rank: number; memberId: string; value: number }[];
  records: readonly { label: string; value: string; memberId: string }[];
}

export interface AddonRankingFacts extends AddonReaders {
  seasonNumber: number | undefined;
  members: readonly AddonRankingMember[];
  boards: readonly AddonRankingBoard[];
}

/**
 * Ranking's boards as the companion hands them to the addon, one record per line, after the head of every bundle's
 * data (addonHead: P, O and M):
 * S;the current season's number (0 without one)
 * U;member id;name;class token, empty without main;portrait, empty without one;title of the week, empty without one
 * B;category;period;metric;unit (gold, count)
 * R;category;period;rank;member id;value (the first places of each board)
 * D;category;period;label;value as written;member id (the records)
 */
export function formatAddonRanking(facts: AddonRankingFacts): string {
  const boards = facts.boards.map((board) => ({ ...board, rows: board.rows.slice(0, ROWS_PER_BOARD) }));
  const shown = new Set(boards.flatMap((board) => [...board.rows, ...board.records].map((entry) => entry.memberId)));
  return [
    ...addonHead(ADDON_RANKING_HEADER, facts),
    line("S", facts.seasonNumber ?? 0),
    ...facts.members
      .filter((member) => shown.has(member.memberId))
      .map((member) =>
        line(
          "U",
          member.memberId,
          text(member.name),
          member.characterClass ?? "",
          member.avatar ?? "",
          text(member.title ?? ""),
        ),
      ),
    ...boards.flatMap((board) => [
      line("B", board.category, board.period, text(board.metric), board.unit),
      ...board.rows.map((row) => line("R", board.category, board.period, row.rank, row.memberId, row.value)),
      ...board.records.map((record) =>
        line("D", board.category, board.period, text(record.label), text(record.value), record.memberId),
      ),
    ]),
  ].join("\n");
}
