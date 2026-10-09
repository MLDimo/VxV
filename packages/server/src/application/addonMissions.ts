import { formatAddonMissions } from "../domain/addonMissions.ts";
import { CREATION_ANSWERS_MS } from "../domain/gameChanges.ts";
import { addonReaders } from "./addonReaders.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/** The missions as the companion hands them to the addon (P12.8): what the Quêtes tab shows in game. */
export function createAddonMissions({
  unitOfWork,
  clock,
  missions,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  missions: {
    list(): Promise<Parameters<typeof formatAddonMissions>[0]["missions"]>;
    hallOfFame(): Promise<Parameters<typeof formatAddonMissions>[0]["hallOfFame"]>;
  };
}) {
  return {
    /** VXV-QUETES text for the companion of any member: an officer's addon passes it on to the guild. */
    async exportMissions(): Promise<string> {
      const listed = await missions.list();
      const fame = await missions.hallOfFame();
      return unitOfWork.run(async (repositories) => {
        const now = clock();
        const changes = await repositories.gameChanges.listForMissions(
          listed.map(({ mission }) => mission.id),
          new Date(now.getTime() - CREATION_ANSWERS_MS),
        );
        return formatAddonMissions({
          ...(await addonReaders(repositories)),
          missions: listed,
          hallOfFame: fame,
          changes,
          exportedAt: now,
        });
      });
    },
  };
}
