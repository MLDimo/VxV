import { formatAddonDeathrolls } from "../domain/addonDeathrolls.ts";
import { isDebt } from "../domain/bets.ts";
import { canGamble } from "../domain/permissions.ts";
import { addonReaders } from "./addonReaders.ts";
import { view } from "./deathrolls.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/**
 * The deathrolls as the companion hands them to the addon (P15): debts, the members without the role « Membre » and
 * the latest games (Ranking: VXV-RANKING).
 */
export function createAddonDeathrolls({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /** VXV-DEATHROLLS text for the companion of any member: an officer's addon passes it on to the guild. */
    exportDeathrolls(): Promise<string> {
      return unitOfWork.run(async (repositories) => {
        const games = (await repositories.deathrolls.listAll()).map(view);
        const betDebtors = (await repositories.stakes.listRanked())
          .filter((stake) => isDebt(stake, stake.outcome))
          .map((stake) => stake.memberId);
        const deathrollDebtors = games.flatMap(({ game, loser }) =>
          game.paidAt === undefined && loser.memberId !== undefined ? [loser.memberId] : [],
        );
        return formatAddonDeathrolls({
          ...(await addonReaders(repositories)),
          barred: [...new Set([...betDebtors, ...deathrollDebtors])],
          newcomers: (await repositories.members.listAll())
            .filter((member) => !canGamble(member.roles))
            .map((member) => member.id),
          games: games.map(({ game, winner, loser }) => ({
            id: game.id,
            winner,
            loser,
            stake: game.stake,
            endedAt: game.endedAt,
            paid: game.paidAt !== undefined,
          })),
          exportedAt: clock(),
        });
      });
    },
  };
}
