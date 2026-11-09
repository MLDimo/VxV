import { avatarName } from "@vxv/design";
import { ADDON_CHIFOUMIS_HEADER, ADDON_DEATHROLLS_HEADER, formatAddonGames } from "../domain/addonGames.ts";
import { DEBT_LIMIT, isDebt } from "../domain/bets.ts";
import { canGamble } from "../domain/permissions.ts";
import { addonReaders } from "./addonReaders.ts";
import { loserOf, winnerOf } from "./debts.ts";
import type { Clock, PlayedGame, Repositories, UnitOfWork } from "./ports.ts";

/**
 * What each member owes (bets, deathrolls, Chi Fou Mi), the members who owe nothing left out, and the members without
 * the role « Membre »: the addon bars from Le Dé Pipé those owing DEBT_LIMIT, and those.
 */
async function debtsAndNewcomers(repositories: Repositories) {
  const owed = new Map<string, number>();
  const owe = (memberId: string | undefined, amount: number) => {
    if (memberId !== undefined) {
      owed.set(memberId, (owed.get(memberId) ?? 0) + amount);
    }
  };
  for (const stake of await repositories.stakes.listRanked()) {
    if (isDebt(stake, stake.outcome)) {
      owe(stake.memberId, stake.amount);
    }
  }
  for (const game of [...(await repositories.deathrolls.listAll()), ...(await repositories.chifoumis.listAll())]) {
    if (game.paidAt === undefined && game.stake > 0) {
      owe(loserOf(game).memberId, game.stake);
    }
  }
  return {
    debts: [...owed].map(([memberId, amount]) => ({ memberId, owed: amount })),
    newcomers: (await repositories.members.listAll())
      .filter((member) => !canGamble(member.roles))
      .map((member) => member.id),
  };
}

/** The members' portraits, by their main character's class, race and sex. */
async function portraits(repositories: Repositories) {
  return (await repositories.members.listLooks()).flatMap((look) => {
    const avatar = look.characterClass === undefined ? undefined : avatarName(look.characterClass, look.race, look.sex);
    return avatar === undefined ? [] : [{ memberId: look.memberId, avatar }];
  });
}

/**
 * Le Dé Pipé's games as the companion hands them to the addon (P15): what each member owes, the players' portraits,
 * the games not paid and the latest games, VXV-DEATHROLLS for the deathroll, VXV-CHIFOUMIS for the Chi Fou Mi (Ranking: VXV-RANKING).
 */
export function createAddonGames({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  function exportGames(header: string, list: (repositories: Repositories) => Promise<PlayedGame[]>): Promise<string> {
    return unitOfWork.run(async (repositories) =>
      formatAddonGames(header, {
        ...(await addonReaders(repositories)),
        ...(await debtsAndNewcomers(repositories)),
        debtLimit: DEBT_LIMIT,
        portraits: await portraits(repositories),
        games: (await list(repositories)).map((game) => ({
          id: game.id,
          winner: winnerOf(game),
          loser: loserOf(game),
          stake: game.stake,
          endedAt: game.endedAt,
          paid: game.paidAt !== undefined,
        })),
        exportedAt: clock(),
      }),
    );
  }

  return {
    /** VXV-DEATHROLLS text for the companion of any member: an officer's addon passes it on to the guild. */
    exportDeathrolls: () => exportGames(ADDON_DEATHROLLS_HEADER, (repositories) => repositories.deathrolls.listAll()),
    /** VXV-CHIFOUMIS text, the same way. */
    exportChifoumis: () => exportGames(ADDON_CHIFOUMIS_HEADER, (repositories) => repositories.chifoumis.listAll()),
  };
}
