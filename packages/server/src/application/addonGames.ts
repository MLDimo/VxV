import { avatarName } from "@vxv/design";
import { ADDON_CHIFOUMIS_HEADER, ADDON_DEATHROLLS_HEADER, formatAddonGames } from "../domain/addonGames.ts";
import { isDebt } from "../domain/bets.ts";
import { canGamble } from "../domain/permissions.ts";
import { addonReaders } from "./addonReaders.ts";
import { loserOf, winnerOf } from "./debts.ts";
import type { Clock, PlayedGame, Repositories, UnitOfWork } from "./ports.ts";

/** The members barred from Le Dé Pipé: in debt (bets, deathrolls, Chi Fou Mi), or without the role « Membre ». */
async function barredMembers(repositories: Repositories) {
  const unpaid = [...(await repositories.deathrolls.listAll()), ...(await repositories.chifoumis.listAll())].filter(
    (game) => game.paidAt === undefined && game.stake > 0,
  );
  const debtors = [
    ...(await repositories.stakes.listRanked()).filter((stake) => isDebt(stake, stake.outcome)).map((s) => s.memberId),
    ...unpaid.flatMap((game) => loserOf(game).memberId ?? []),
  ];
  return {
    barred: [...new Set(debtors)],
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
 * Le Dé Pipé's games as the companion hands them to the addon (P15): who is barred, the games not paid and the latest
 * games, VXV-DEATHROLLS for the deathroll, VXV-CHIFOUMIS for the Chi Fou Mi (Ranking: VXV-RANKING).
 */
export function createAddonGames({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  function exportGames(
    header: string,
    list: (repositories: Repositories) => Promise<PlayedGame[]>,
    withPortraits: boolean,
  ): Promise<string> {
    return unitOfWork.run(async (repositories) =>
      formatAddonGames(header, {
        ...(await addonReaders(repositories)),
        ...(await barredMembers(repositories)),
        portraits: withPortraits ? await portraits(repositories) : [],
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
    exportDeathrolls: () =>
      exportGames(ADDON_DEATHROLLS_HEADER, (repositories) => repositories.deathrolls.listAll(), false),
    /** VXV-CHIFOUMIS text, the same way, with the members' portraits its window draws. */
    exportChifoumis: () =>
      exportGames(ADDON_CHIFOUMIS_HEADER, (repositories) => repositories.chifoumis.listAll(), true),
  };
}
