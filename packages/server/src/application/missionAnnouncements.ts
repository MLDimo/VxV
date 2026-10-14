import type { DiscordMessage } from "../domain/bets.ts";
import { missionScores, missionStatus } from "../domain/missions.ts";
import { createMessageAnnouncements } from "./messageAnnouncements.ts";
import type { Clock, UnitOfWork } from "./ports.ts";
import type { MissionAnnouncer } from "./discordPorts.ts";

/** Each mission's message on Discord, with its ranking (P12.2, P12.5); and its results once validated. */
export function createMissionAnnouncements({
  unitOfWork,
  announcer,
  clock,
}: {
  unitOfWork: UnitOfWork;
  announcer: MissionAnnouncer;
  clock: Clock;
}) {
  const store = {
    load: (missionId: string) =>
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
    save: (missionId: string, message: DiscordMessage) =>
      unitOfWork.run(({ missions }) => missions.setDiscordMessage(missionId, message)),
  };
  return {
    ...createMessageAnnouncements({ label: "mission", announcer, store }),

    /**
     * The results of a mission whose result an officer validated, published in the missions channel (owner's request
     * of 14 October): never fails, whatever Discord answers. False when they were not published.
     */
    async publishResults(missionId: string): Promise<boolean> {
      try {
        const loaded = await store.load(missionId);
        if (loaded?.item.status !== "closed") {
          return false;
        }
        await announcer.results(loaded.item);
        return true;
      } catch (error) {
        console.error("Discord mission results failed", error);
        return false;
      }
    },
  };
}
