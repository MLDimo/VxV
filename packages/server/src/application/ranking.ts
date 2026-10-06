import { startOfMonth } from "../domain/dateTime.ts";
import type { SeasonStartRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { bettorsRanking, type BettorRank, type RankingPeriod } from "../domain/ranking.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, Season, UnitOfWork } from "./ports.ts";

export interface Ranking {
  season: Season | undefined;
  bettors: BettorRank[];
}

/** The rankings (P11.7), and the seasons officers start. */
export function createRanking({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /** The bettors of the bets ended in the period; "season" counts from the current season's start, if any. */
    bettors(period: RankingPeriod): Promise<Ranking> {
      return unitOfWork.run(async ({ stakes, seasons }) => {
        const season = await seasons.current();
        if (period === "season" && season === undefined) {
          return { season, bettors: [] };
        }
        const since = period === "month" ? startOfMonth(clock()) : period === "season" ? season?.startedAt : undefined;
        return { season, bettors: bettorsRanking(await stakes.listRanked(), since) };
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
