import { startOfMonth } from "../domain/dateTime.ts";
import type { SeasonStartRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { RANKING_PERIODS, type RankingPeriod } from "../domain/ranking.ts";
import {
  betsBoard,
  deathrollsBoard,
  RANKING_CATEGORIES,
  questsBoard,
  RANKING_METRICS,
  titlesBoard,
  type NameOf,
  type RankingBoard,
  type RankingCategory,
  type RankingUnit,
} from "../domain/rankingBoards.ts";
import { TITLES, titleWeek } from "../domain/titles.ts";
import { rankedDeathroll } from "./debts.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, MemberLook, Repositories, Season, UnitOfWork } from "./ports.ts";

/** A member's line on a board, as the website and the addon show it. */
export interface RankingLine extends MemberLook {
  rank: number;
  value: number;
  /** The member's first title of the week, if any. */
  title: string | undefined;
}

export interface RankingRecordLine {
  label: string;
  value: string;
  member: MemberLook;
}

export interface RankingView {
  category: RankingCategory;
  period: RankingPeriod;
  season: Season | undefined;
  metric: string;
  unit: RankingUnit;
  lines: RankingLine[];
  records: RankingRecordLine[];
}

/** When the period starts: this month, the current season (none started: nothing to rank), or always. */
export function periodStart(period: RankingPeriod, season: Season | undefined, now: Date): Date | undefined | null {
  if (period === "season") {
    return season?.startedAt ?? null;
  }
  return period === "month" ? startOfMonth(now) : undefined;
}

/** The category's board over the period from the instant (all of it without one). */
async function boardOf(
  repositories: Repositories,
  category: RankingCategory,
  since: Date | undefined,
  nameOf: NameOf,
): Promise<RankingBoard> {
  switch (category) {
    case "paris":
      return betsBoard(await repositories.stakes.listRanked(), since, nameOf);
    case "deathroll":
      return deathrollsBoard(
        (await repositories.deathrolls.listAll()).flatMap((game) => rankedDeathroll(game) ?? []),
        since,
        nameOf,
      );
    case "quetes": {
      const missions = await repositories.missions.listClosed();
      const endsAt = new Map(missions.map((mission) => [mission.id, mission.endsAt]));
      const rewards = await repositories.missionRewards.listForMissions(missions.map((mission) => mission.id));
      return questsBoard(
        rewards.map((reward) => ({ ...reward, at: endsAt.get(reward.missionId) ?? new Date(0) })),
        since,
        nameOf,
      );
    }
    case "titres": {
      const sinceWeek = since === undefined ? undefined : titleWeek(since);
      return titlesBoard(await repositories.titles.listHeld(sinceWeek), sinceWeek, nameOf);
    }
  }
}

/** What every board of a transaction shares: the season, the members' looks and their titles of the week. */
async function boardContext(repositories: Repositories) {
  const season = await repositories.seasons.current();
  const looks = new Map((await repositories.members.listLooks()).map((look) => [look.memberId, look]));
  const lookOf = (memberId: string): MemberLook =>
    looks.get(memberId) ?? { memberId, name: "", characterClass: undefined, race: undefined, sex: undefined };
  const holders = await repositories.titles.listLatestWeeks(1);
  const titleOf = (memberId: string) =>
    TITLES.find((title) => holders.some((holder) => holder.memberId === memberId && holder.titleId === title.id))?.name;
  return { season, lookOf, titleOf };
}

/** A category's board over the period, each member shown by their main character with their title. */
async function viewOf(
  repositories: Repositories,
  { season, lookOf, titleOf }: Awaited<ReturnType<typeof boardContext>>,
  category: RankingCategory,
  period: RankingPeriod,
  now: Date,
): Promise<RankingView> {
  const since = periodStart(period, season, now);
  const board: RankingBoard =
    since === null
      ? { ...RANKING_METRICS[category], rows: [], records: [] }
      : await boardOf(repositories, category, since, (memberId) => lookOf(memberId).name);
  return {
    category,
    period,
    season,
    metric: board.metric,
    unit: board.unit,
    lines: board.rows.map((row) => ({
      ...lookOf(row.memberId),
      rank: row.rank,
      value: row.value,
      title: titleOf(row.memberId),
    })),
    records: board.records.map((record) => ({
      label: record.label,
      value: record.value,
      member: lookOf(record.memberId),
    })),
  };
}

/** The rankings (P11.7, §7.5), and the seasons officers start. */
export function createRanking({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /** A category's board over the period. */
    board(category: RankingCategory, period: RankingPeriod): Promise<RankingView> {
      return unitOfWork.run(async (repositories) =>
        viewOf(repositories, await boardContext(repositories), category, period, clock()),
      );
    },

    /** Every category's board over every period, for the addon. */
    all(): Promise<RankingView[]> {
      return unitOfWork.run(async (repositories) => {
        const context = await boardContext(repositories);
        const views: RankingView[] = [];
        for (const category of RANKING_CATEGORIES) {
          for (const period of RANKING_PERIODS) {
            views.push(await viewOf(repositories, context, category, period, clock()));
          }
        }
        return views;
      });
    },

    /** An officer starts a new season: the rankings by season start again from it. */
    async startSeason(officer: Member, reason: string): Promise<Season> {
      const motive = checkOfficerAction(officer, reason);
      return unitOfWork.run(async ({ seasons, journal }) => {
        const season = await seasons.start(officer.id, clock());
        const after: SeasonStartRecord = { number: season.number };
        await journal.record({
          actorId: officer.id,
          action: "season.start",
          entity: "season",
          entityId: String(season.number),
          before: null,
          after,
          reason: motive,
        });
        return season;
      });
    },
  };
}
