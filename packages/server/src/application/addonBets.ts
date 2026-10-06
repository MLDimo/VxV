import { ADDON_BETS_HEADER, formatAddonBets } from "../domain/addonBets.ts";
import { cashSummary } from "../domain/cash.ts";
import { startOfMonth } from "../domain/dateTime.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { bettorsRanking } from "../domain/ranking.ts";
import { BETS_LISTED } from "./bets.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

export { ADDON_BETS_HEADER };

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
        const members = await repositories.members.listAll();
        const characters = (await repositories.characters.listAll()).filter((character) => character.inGuild);
        const movements = await repositories.cash.listAll();
        const ranked = await repositories.stakes.listRanked();
        const changes = await repositories.gameChanges.listForBets(betIds);
        const managers = new Set(members.filter((member) => canManageRaids(member.roles)).map((member) => member.id));
        return formatAddonBets({
          bets: bets.map((bet) => ({ bet, stakes: stakes.filter((stake) => stake.betId === bet.id) })),
          officers: characters.filter(
            (character) => character.memberId !== undefined && managers.has(character.memberId),
          ),
          characters,
          cash: { ...cashSummary(movements, startOfMonth(now)), movements },
          ranking: bettorsRanking(ranked, undefined),
          changes,
          exportedAt: now,
        });
      });
    },
  };
}
