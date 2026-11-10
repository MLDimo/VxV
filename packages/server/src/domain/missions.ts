import type { DiscordMessage } from "./bets.ts";

/**
 * Weekly missions (P12): a challenge for the whole guild, counted by the game itself. The score of a member is what
 * their characters' game counter gained during the mission (main and rerolls added); the first three share the
 * reward, 70 %, 20 % and 10 %. The race to level 60 (owner's request of 3 November) ranks instead the highest level
 * a member's characters reached during the mission: the first at 60 wins.
 */

export const MISSION_TYPES = [
  "fishing",
  "herbalism",
  "mining",
  "skinning",
  "honorableKills",
  "levels",
  "level60",
  "dungeons",
  "battlegrounds",
] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

/** The race's finish: Classic's highest level. */
export const TOP_LEVEL = 60;
/** The mission won by the first to bring a character to TOP_LEVEL, the others ranked by their highest level. */
const RACE: MissionType = "level60";

/** Each type: its name, the mission's usual title, and what its counter counts. */
export const MISSION_TYPE_LABELS: Record<MissionType, { name: string; title: string; counts: string }> = {
  fishing: { name: "Pêche", title: "Le Grand Pêcheur", counts: "pêches réussies" },
  herbalism: { name: "Herboristerie", title: "La Main verte", counts: "herbes cueillies" },
  mining: { name: "Minage", title: "Le Cœur de pierre", counts: "filons minés" },
  skinning: { name: "Dépeçage", title: "Le Tanneur", counts: "peaux dépecées" },
  honorableKills: { name: "Victoires honorables", title: "Le Chasseur de têtes", counts: "victoires honorables" },
  levels: { name: "Gain de niveau", title: "L'Ascension", counts: "niveaux gagnés" },
  level60: { name: `Niveau ${String(TOP_LEVEL)}`, title: `La Course au ${String(TOP_LEVEL)}`, counts: "niveaux" },
  dungeons: { name: "Donjons en guilde", title: "Les Compagnons de route", counts: "donjons finis en guilde" },
  battlegrounds: {
    name: "Champs de bataille en guilde",
    title: "Les Frères d'armes",
    counts: "champs de bataille gagnés en guilde",
  },
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

/**
 * A character's progress: the counter's steps over its value at the start (or at its first reading after). In the
 * race, each step is the level reached once it rose, and a character already at the top does not run.
 */
function characterSteps(readings: readonly CounterReading[], mission: Pick<Mission, "type" | "startsAt" | "endsAt">) {
  const sorted = [...readings].sort((left, right) => left.readAt.getTime() - right.readAt.getTime());
  const before = sorted.filter((reading) => reading.readAt <= mission.startsAt).at(-1);
  const during = sorted.filter((reading) => reading.readAt > mission.startsAt && reading.readAt <= mission.endsAt);
  const baseline = before ?? during[0];
  if (baseline === undefined) {
    return [];
  }
  if (mission.type === RACE) {
    return baseline.value >= TOP_LEVEL
      ? []
      : during.map((reading) => ({ at: reading.readAt, score: reading.value > baseline.value ? reading.value : 0 }));
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
    // The member's score after each reading: each character's latest score, added up (in the race, the highest).
    const latest = new Map<string, number>();
    let score = 0;
    let reachedAt: Date | undefined;
    for (const step of steps) {
      latest.set(step.characterId, step.score);
      const values = [...latest.values()];
      const total = mission.type === RACE ? Math.max(...values) : values.reduce((sum, value) => sum + value, 0);
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

/**
 * The members who may win the mission, in order: in the race, only those who brought a character to TOP_LEVEL, the
 * first there first (owner's decision of 10 November: nobody at TOP_LEVEL, no winner); else every member who scored.
 */
export function missionWinners<S extends Pick<MissionScore, "score">>(type: MissionType, scores: readonly S[]): S[] {
  return type === RACE ? scores.filter((score) => score.score >= TOP_LEVEL) : [...scores];
}

/** The first three's rewards: 70 %, 20 % and 10 % of the reward, rounded down; a share without anyone stays. */
export function missionRewards(type: MissionType, scores: readonly MissionScore[], reward: number): MissionReward[] {
  const winners = missionWinners(type, scores);
  return REWARD_SHARES.flatMap((share, index) => {
    const score = winners[index];
    return score === undefined
      ? []
      : [{ memberId: score.memberId, rank: index + 1, amount: Math.floor((reward * share) / PERCENT) }];
  });
}

/** The mission's end, some days after its start: a week by default. */
export function missionEnd(startsAt: Date, days: number = DEFAULT_MISSION_DAYS): Date {
  return new Date(startsAt.getTime() + days * DAY_MS);
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
      entry.wins += rewards.some((reward) => reward.memberId === score.memberId && reward.rank === 1) ? 1 : 0;
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

/** "le plus de pêches réussies", "le plus d'herbes cueillies". */
function mostOf(counts: string): string {
  return /^[aeiouyhéèê]/i.test(counts) ? `le plus d'${counts}` : `le plus de ${counts}`;
}

/** What wins the mission: "le plus de pêches réussies", "le premier au niveau 60". */
export function missionGoal(type: MissionType): string {
  return type === RACE ? `le premier au niveau ${String(TOP_LEVEL)}` : mostOf(MISSION_TYPE_LABELS[type].counts);
}

/** A member's score as words: "12 pêches réussies", "niveau 42". */
export function formatMissionScore(type: MissionType, score: number): string {
  return type === RACE ? `niveau ${String(score)}` : `${String(score)} ${MISSION_TYPE_LABELS[type].counts}`;
}

/** What the guild rewards, as the quest's parchment tells it. */
export function missionPitch(type: MissionType): string {
  if (type === RACE) {
    return (
      `Le premier à mener un personnage au niveau ${String(TOP_LEVEL)} d'ici la fin remporte la récompense : ` +
      "chacun est classé sur le plus haut niveau atteint par ses personnages, d'après le jeu. " +
      `Personne au niveau ${String(TOP_LEVEL)} à la fin : pas de gagnant.`
    );
  }
  return (
    `Qui fera ${missionGoal(type)} d'ici la fin remporte la récompense : ` +
    "main et rerolls additionnés, d'après les compteurs du jeu."
  );
}

/** The places on the podium, rewarded. */
export const PODIUM = REWARD_SHARES.length;

/** Where a member stands in a mission: their place (none without a score) and how far from the place above. */
export interface MissionProgress {
  place: number | undefined;
  text: string;
}

/**
 * The member's progress: ahead, on the podium, or how much more to climb on it (a tie goes to the first to reach). In
 * the race, a member at the top cannot climb any more.
 */
export function missionProgress(
  scores: readonly Pick<MissionScore, "memberId" | "score">[],
  memberId: string,
  type: MissionType,
): MissionProgress {
  const { counts } = MISSION_TYPE_LABELS[type];
  const index = scores.findIndex((score) => score.memberId === memberId);
  const mine = scores[index];
  if (mine === undefined || mine.score <= 0) {
    return { place: undefined, text: "Rien encore : l'addon VXV relève ton compteur en jeu." };
  }
  const place = index + 1;
  if (type === RACE && mine.score >= TOP_LEVEL) {
    return {
      place,
      text:
        place === 1 ? `Premier au niveau ${String(TOP_LEVEL)}` : `Niveau ${String(TOP_LEVEL)} atteint, après d'autres`,
    };
  }
  if (type === RACE) {
    return {
      place,
      text: `Encore ${String(TOP_LEVEL - mine.score)} ${counts} pour le niveau ${String(TOP_LEVEL)} : seul ce niveau gagne`,
    };
  }
  const toPass = (above: number) => `${String(above - mine.score + 1)} ${counts}`;
  if (place === 1) {
    const second = scores[1]?.score ?? 0;
    return { place, text: `En tête, avec ${String(mine.score - second)} ${counts} d'avance` };
  }
  if (place <= PODIUM) {
    return { place, text: `Sur le podium : encore ${toPass(scores[0]?.score ?? 0)} pour la 1re place` };
  }
  return { place, text: `Encore ${toPass(scores[PODIUM - 1]?.score ?? 0)} pour monter sur le podium` };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** How long ago a mission ended: "Cette semaine", "Semaine dernière", "Il y a 3 semaines". */
export function endedAgo(endsAt: Date, now: Date): string {
  const weeks = Math.floor((now.getTime() - endsAt.getTime()) / WEEK_MS);
  if (weeks <= 0) {
    return "Cette semaine";
  }
  return weeks === 1 ? "Semaine dernière" : `Il y a ${String(weeks)} semaines`;
}
