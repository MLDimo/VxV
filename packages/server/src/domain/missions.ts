import type { DiscordMessage } from "./bets.ts";

/**
 * Weekly missions (P12): a challenge for the whole guild, counted by the game itself. The score of a member is what
 * their characters' game counter gained during the mission (main and rerolls added); the first three share the
 * reward, 70 %, 20 % and 10 %.
 */

export const MISSION_TYPES = ["fishing", "herbalism", "mining", "skinning", "honorableKills"] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

/** Each type: its name, the mission's usual title, and what its counter counts. */
export const MISSION_TYPE_LABELS: Record<MissionType, { name: string; title: string; counts: string }> = {
  fishing: { name: "Pêche", title: "Le Grand Pêcheur", counts: "pêches réussies" },
  herbalism: { name: "Herboristerie", title: "La Main verte", counts: "herbes cueillies" },
  mining: { name: "Minage", title: "Le Cœur de pierre", counts: "filons minés" },
  skinning: { name: "Dépeçage", title: "Le Tanneur", counts: "peaux dépecées" },
  honorableKills: { name: "Victoires honorables", title: "Le Chasseur de têtes", counts: "victoires honorables" },
};

export const DEFAULT_MISSION_DAYS = 7;
export const MAX_MISSION_DAYS = 31;
export const MAX_MISSION_TITLE_LENGTH = 60;
/** The shares of the reward, in percent, from the first to the third. */
export const REWARD_SHARES = [70, 20, 10] as const;
const PERCENT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NewMission {
  type: MissionType;
  title: string;
  /** Gold pieces shared by the first three. */
  reward: number;
  startsAt: Date;
  endsAt: Date;
}

export interface Mission extends NewMission {
  id: string;
  createdAt: Date;
  /** When an officer validated the result; undefined before. */
  closedAt: Date | undefined;
  /** The mission's message on Discord, once published. */
  discordMessage: DiscordMessage | undefined;
}

/** Where a mission stands at an instant. */
export type MissionStatus = "upcoming" | "running" | "ended" | "closed";

export function missionStatus(mission: Pick<Mission, "startsAt" | "endsAt" | "closedAt">, now: Date): MissionStatus {
  if (mission.closedAt !== undefined) {
    return "closed";
  }
  if (now < mission.startsAt) {
    return "upcoming";
  }
  return now < mission.endsAt ? "running" : "ended";
}

/** A reading of a character's game counter, as their addon made it. */
export interface CounterReading {
  characterId: string;
  memberId: string;
  memberName: string;
  memberClass: string | undefined;
  type: MissionType;
  value: number;
  readAt: Date;
}

export interface MissionScore {
  memberId: string;
  memberName: string;
  memberClass: string | undefined;
  score: number;
  /** When the member reached their score: the first one there comes first in a tie. */
  reachedAt: Date;
}

/** Why a new mission cannot be published, or undefined when it can. */
export function newMissionRefusal(mission: NewMission, now: Date): string | undefined {
  if (!MISSION_TYPES.includes(mission.type)) {
    return "Choisis le type de la mission.";
  }
  const title = mission.title.trim();
  if (title === "" || title.length > MAX_MISSION_TITLE_LENGTH) {
    return `Donne à la mission un titre de ${String(MAX_MISSION_TITLE_LENGTH)} caractères au plus.`;
  }
  if (!Number.isInteger(mission.reward) || mission.reward < 1) {
    return "Récompense en pièces d'or entières, 1 po au moins.";
  }
  const days = (mission.endsAt.getTime() - mission.startsAt.getTime()) / DAY_MS;
  if (Number.isNaN(days) || days <= 0 || days > MAX_MISSION_DAYS) {
    return `Une mission dure de quelques heures à ${String(MAX_MISSION_DAYS)} jours.`;
  }
  if (mission.endsAt <= now) {
    return "La fin de la mission doit être à venir.";
  }
  return undefined;
}

/** A character's progress: the counter's steps over its value at the start (or at its first reading after). */
function characterSteps(readings: readonly CounterReading[], mission: Pick<Mission, "startsAt" | "endsAt">) {
  const sorted = [...readings].sort((left, right) => left.readAt.getTime() - right.readAt.getTime());
  const before = sorted.filter((reading) => reading.readAt <= mission.startsAt).at(-1);
  const during = sorted.filter((reading) => reading.readAt > mission.startsAt && reading.readAt <= mission.endsAt);
  const baseline = before ?? during[0];
  if (baseline === undefined) {
    return [];
  }
  return during.map((reading) => ({ at: reading.readAt, score: Math.max(0, reading.value - baseline.value) }));
}

/**
 * The members' scores on the mission, the best first; in a tie, the first to reach the score comes first. Members
 * whose counter did not move are left out.
 */
export function missionScores(
  mission: Pick<Mission, "type" | "startsAt" | "endsAt">,
  readings: readonly CounterReading[],
): MissionScore[] {
  const byCharacter = new Map<string, CounterReading[]>();
  for (const reading of readings.filter((candidate) => candidate.type === mission.type)) {
    byCharacter.set(reading.characterId, [...(byCharacter.get(reading.characterId) ?? []), reading]);
  }
  const byMember = new Map<
    string,
    { first: CounterReading; steps: { characterId: string; at: Date; score: number }[] }
  >();
  for (const [characterId, own] of byCharacter) {
    const [first] = own;
    if (first === undefined) {
      continue;
    }
    const member = byMember.get(first.memberId) ?? { first, steps: [] };
    member.steps.push(...characterSteps(own, mission).map((step) => ({ characterId, ...step })));
    byMember.set(first.memberId, member);
  }
  const scores = [...byMember.values()].flatMap(({ first, steps }) => {
    steps.sort((left, right) => left.at.getTime() - right.at.getTime());
    // The member's score after each reading: each character's latest score, added up.
    const latest = new Map<string, number>();
    let score = 0;
    let reachedAt: Date | undefined;
    for (const step of steps) {
      latest.set(step.characterId, step.score);
      const total = [...latest.values()].reduce((sum, value) => sum + value, 0);
      if (total !== score) {
        score = total;
        reachedAt = step.at;
      }
    }
    return score > 0 && reachedAt !== undefined
      ? [{ memberId: first.memberId, memberName: first.memberName, memberClass: first.memberClass, score, reachedAt }]
      : [];
  });
  return scores.sort((left, right) => right.score - left.score || left.reachedAt.getTime() - right.reachedAt.getTime());
}

export interface MissionReward {
  memberId: string;
  rank: number;
  amount: number;
}

/** The first three's rewards: 70 %, 20 % and 10 % of the reward, rounded down; a share without anyone stays. */
export function missionRewards(scores: readonly MissionScore[], reward: number): MissionReward[] {
  return REWARD_SHARES.flatMap((share, index) => {
    const score = scores[index];
    return score === undefined
      ? []
      : [{ memberId: score.memberId, rank: index + 1, amount: Math.floor((reward * share) / PERCENT) }];
  });
}

/** The mission's end by default: a week after its start. */
export function defaultEnd(startsAt: Date): Date {
  return new Date(startsAt.getTime() + DEFAULT_MISSION_DAYS * DAY_MS);
}

export interface HallOfFameEntry {
  memberId: string;
  memberName: string;
  memberClass: string | undefined;
  /** Missions the member won (first place). */
  wins: number;
  /** The rewards they received. */
  gains: number;
  /** Their mean place over the missions where they scored at least one point. */
  averagePosition: number;
}

/** The hall of fame (P12.7) over the closed missions: the most wins first, then the most gold. */
export function hallOfFame(
  results: readonly { scores: readonly MissionScore[]; rewards: readonly MissionReward[] }[],
): HallOfFameEntry[] {
  const entries = new Map<string, HallOfFameEntry & { places: number[] }>();
  for (const { scores, rewards } of results) {
    scores.forEach((score, index) => {
      const entry = entries.get(score.memberId) ?? {
        memberId: score.memberId,
        memberName: score.memberName,
        memberClass: score.memberClass,
        wins: 0,
        gains: 0,
        averagePosition: 0,
        places: [],
      };
      entry.places.push(index + 1);
      entry.wins += index === 0 ? 1 : 0;
      entry.gains += rewards.find((reward) => reward.memberId === score.memberId)?.amount ?? 0;
      entries.set(score.memberId, entry);
    });
  }
  return [...entries.values()]
    .map(({ places, ...entry }) => ({
      ...entry,
      averagePosition: places.reduce((sum, place) => sum + place, 0) / places.length,
    }))
    .sort(
      (left, right) =>
        right.wins - left.wins || right.gains - left.gains || left.averagePosition - right.averagePosition,
    );
}

/** A reward of a closed mission, with its member, and whether the treasurer handed it over. */
export interface MissionRewardRecord extends MissionReward {
  missionId: string;
  memberName: string;
  memberClass: string | undefined;
  paidAt: Date | undefined;
}
