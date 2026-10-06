import { addonHead, line, seconds, text, type AddonReaders } from "./addonText.ts";
import type { HallOfFameEntry, Mission, MissionRewardRecord, MissionScore } from "./missions.ts";

/** First line of the missions' data for the addon (contract with VXV_Missions); the number is the format version. */
export const ADDON_MISSIONS_HEADER = "VXV-QUETES-1";

/** How many places of each ranking, and of the hall of fame, the addon shows. */
export const ADDON_RANKED_PLACES = 10;

export interface AddonMissionsFacts extends AddonReaders {
  missions: readonly { mission: Mission; scores: readonly MissionScore[]; rewards: readonly MissionRewardRecord[] }[];
  hallOfFame: readonly HallOfFameEntry[];
}

/**
 * The missions as the companion hands them to the addon, one record per line, after the head of every bundle's
 * data (addonHead: P, O and M):
 * Q;mission id;type;start;end;validation (Unix seconds, 0 before);reward;title
 * R;mission id;member id;member;class token, empty without main;score;reached (Unix seconds) (the first, in order)
 * W;mission id;place;member;amount;1 when handed over (the rewards of a validated mission)
 * F;member;class token, empty without main;missions won;gains;mean place (the hall of fame, in order)
 * The addon parses the lines in this order.
 */
export function formatAddonMissions(facts: AddonMissionsFacts): string {
  return [
    ...addonHead(ADDON_MISSIONS_HEADER, facts),
    ...facts.missions.flatMap(({ mission, scores, rewards }) => [
      line(
        "Q",
        mission.id,
        mission.type,
        seconds(mission.startsAt),
        seconds(mission.endsAt),
        mission.closedAt === undefined ? 0 : seconds(mission.closedAt),
        mission.reward,
        text(mission.title),
      ),
      ...scores
        .slice(0, ADDON_RANKED_PLACES)
        .map((score) =>
          line(
            "R",
            mission.id,
            score.memberId,
            text(score.memberName),
            score.memberClass ?? "",
            score.score,
            seconds(score.reachedAt),
          ),
        ),
      ...rewards.map((reward) =>
        line("W", mission.id, reward.rank, text(reward.memberName), reward.amount, reward.paidAt === undefined ? 0 : 1),
      ),
    ]),
    ...facts.hallOfFame
      .slice(0, ADDON_RANKED_PLACES)
      .map((entry) =>
        line(
          "F",
          text(entry.memberName),
          entry.memberClass ?? "",
          entry.wins,
          entry.gains,
          entry.averagePosition.toFixed(1),
        ),
      ),
  ].join("\n");
}
