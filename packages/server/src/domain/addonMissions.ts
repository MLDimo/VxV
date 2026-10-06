import { line, seconds, text } from "./addonText.ts";
import { fullName, type Character } from "./characters.ts";
import type { HallOfFameEntry, Mission, MissionRewardRecord, MissionScore } from "./missions.ts";

/** First line of the missions' data for the addon (contract with VXV_Missions); the number is the format version. */
export const ADDON_MISSIONS_HEADER = "VXV-QUETES-1";

/** How many places of each ranking, and of the hall of fame, the addon shows. */
export const ADDON_RANKED_PLACES = 10;

export interface AddonMissionsFacts {
  missions: readonly { mission: Mission; scores: readonly MissionScore[]; rewards: readonly MissionRewardRecord[] }[];
  /** Characters of the officers and the guild master: the addon takes the missions' data from them only. */
  officers: readonly Character[];
  /** The guild's characters linked to a member: the addon adds up a member's characters. */
  characters: readonly Character[];
  hallOfFame: readonly HallOfFameEntry[];
  exportedAt: Date;
}

/**
 * The missions as the companion hands them to the addon, one record per line:
 * P;export (Unix seconds)
 * O;officer character
 * M;member id;character of the member
 * Q;mission id;type;start;end;validation (Unix seconds, 0 before);reward;title
 * R;mission id;member id;member;class token, empty without main;score;reached (Unix seconds) (the first, in order)
 * W;mission id;place;member;amount;1 when handed over (the rewards of a validated mission)
 * F;member;class token, empty without main;missions won;gains;mean place (the hall of fame, in order)
 * The addon parses the lines in this order.
 */
export function formatAddonMissions(facts: AddonMissionsFacts): string {
  return [
    ADDON_MISSIONS_HEADER,
    line("P", seconds(facts.exportedAt)),
    ...facts.officers.map((officer) => line("O", fullName(officer))),
    ...facts.characters.flatMap((character) =>
      character.memberId === undefined ? [] : [line("M", character.memberId, fullName(character))],
    ),
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
