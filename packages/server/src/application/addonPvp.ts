import { avatarName } from "@vxv/design";
import { formatAddonPvp } from "../domain/addonPvp.ts";
import { EVENT_LISTED_AFTER_START_MS } from "../domain/events.ts";
import { addonReaders } from "./addonReaders.ts";
import type { DuelBoard, DuelView } from "./duels.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/** The PvP as the companion hands it to the addon (VXV_PvP): the outings to come, the duels and their ranking. */
export function createAddonPvp({
  unitOfWork,
  clock,
  duels,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  duels: { list(): Promise<DuelView[]>; ranking(): Promise<DuelBoard> };
}) {
  return {
    /** VXV-PVP text for the companion of any member: an officer's addon passes it on to the guild. */
    async exportPvp(): Promise<string> {
      const views = await duels.list();
      const board = await duels.ranking();
      const looks = [
        ...views.flatMap((view) => [view.challenger, view.opponent]),
        ...board.lines.map((entry) => entry.member),
        ...board.records.map((record) => record.member),
      ];
      const players = new Map(looks.map((look) => [look.memberId, look]));
      return unitOfWork.run(async (repositories) => {
        const now = clock();
        const since = new Date(now.getTime() - EVENT_LISTED_AFTER_START_MS);
        const outings = [];
        for (const event of await repositories.events.listStartingAfter(since, "pvp")) {
          outings.push({ event, signups: await repositories.signups.listByEvent(event.id) });
        }
        const changes = await repositories.gameChanges.listForPvp(
          outings.map(({ event }) => event.id),
          views.map((view) => view.duel.id),
        );
        return formatAddonPvp({
          ...(await addonReaders(repositories)),
          outings,
          duels: views.map(({ duel, status }) => ({ duel, status })),
          players: [...players.values()].map((look) => ({
            ...look,
            avatar:
              look.characterClass === undefined ? undefined : avatarName(look.characterClass, look.race, look.sex),
          })),
          ranking: board.lines.map((entry) => ({ ...entry, memberId: entry.member.memberId })),
          records: board.records.map((record) => ({ ...record, memberId: record.member.memberId })),
          changes,
          exportedAt: now,
        });
      });
    },
  };
}
