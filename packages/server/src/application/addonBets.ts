import { formatAddonBets } from "../domain/addonBets.ts";
import { cashSummary } from "../domain/cash.ts";
import { startOfMonth } from "../domain/dateTime.ts";
import { bettorsRanking } from "../domain/ranking.ts";
import { addonReaders } from "./addonReaders.ts";
import { BETS_LISTED } from "./bets.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/** The bets as the companion hands them to the addon (P11.8): what Le Dé Pipé shows in game. */
export function createAddonBets({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /** VXV-PARIS text for the companion of any member: an officer's addon passes it on to the guild. */
    exportBets(): Promise<string> {
      return unitOfWork.run(async (repositories) => {
        const now = clock();
        const bets = await repositories.bets.listRecent(BETS_LISTED);
        const betIds = bets.map((bet) => bet.id);
        const stakes = await repositories.stakes.listByBets(betIds);
        const movements = await repositories.cash.listAll();
        const ranked = await repositories.stakes.listRanked();
        const changes = await repositories.gameChanges.listForBets(betIds);
        return formatAddonBets({
          ...(await addonReaders(repositories)),
          bets: bets.map((bet) => ({ bet, stakes: stakes.filter((stake) => stake.betId === bet.id) })),
          cash: { ...cashSummary(movements, startOfMonth(now)), movements },
          ranking: bettorsRanking(ranked, undefined),
          changes,
          exportedAt: now,
        });
      });
    },
  };
}
