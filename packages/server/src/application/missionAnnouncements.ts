import { missionScores, missionStatus } from "../domain/missions.ts";
import { createMessageAnnouncements } from "./messageAnnouncements.ts";
import type { Clock, MissionAnnouncer, UnitOfWork } from "./ports.ts";

/** Each mission's message on Discord, with its ranking (P12.2, P12.5). */
export function createMissionAnnouncements({
  unitOfWork,
  announcer,
  clock,
}: {
  unitOfWork: UnitOfWork;
  announcer: MissionAnnouncer;
  clock: Clock;
}) {
  return createMessageAnnouncements({
    label: "mission",
    announcer,
    store: {
      load: (missionId) =>
        unitOfWork.run(async ({ missions, counterReadings }) => {
          const mission = await missions.findById(missionId);
          if (mission === undefined) {
            return undefined;
          }
          const readings = await counterReadings.listUntil(mission.type, mission.endsAt);
          return {
            item: { mission, status: missionStatus(mission, clock()), scores: missionScores(mission, readings) },
            message: mission.discordMessage,
          };
        }),
      save: (missionId, message) => unitOfWork.run(({ missions }) => missions.setDiscordMessage(missionId, message)),
    },
  });
}
