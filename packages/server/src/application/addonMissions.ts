import { formatAddonMissions } from "../domain/addonMissions.ts";
import { canManageRaids } from "../domain/permissions.ts";
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
      return unitOfWork.run(async ({ members, characters }) => {
        const all = await members.listAll();
        const managers = new Set(all.filter((member) => canManageRaids(member.roles)).map((member) => member.id));
        const inGuild = (await characters.listAll()).filter((character) => character.inGuild);
        return formatAddonMissions({
          missions: listed,
          officers: inGuild.filter((character) => character.memberId !== undefined && managers.has(character.memberId)),
          characters: inGuild,
          hallOfFame: fame,
          exportedAt: clock(),
        });
      });
    },
  };
}
