/**
 * The guild's titles (P13): each week, each title goes to the member ahead on its rule over the season (since its
 * start, or since always without one). A tie goes to the first to reach the score. A new title is a new rule here,
 * without any update of the addon.
 */

export const TITLES = [
  { id: "gamblingKing", name: "Roi du gambling", rule: "Plus gros gain net aux paris sur la saison." },
  { id: "debtKing", name: "Roi de la dette", rule: "Plus grosse perte nette aux paris sur la saison." },
  { id: "numberOne", name: "Numéro UNO", rule: "Vainqueur de la dernière mission de guilde terminée." },
  { id: "wellFed", name: "Bien gras", rule: "Le plus d'objets reçus en raid sur la saison." },
  { id: "floorTaster", name: "Goûteur de sol", rule: "Le plus de morts pendant les raids VXV sur la saison." },
  { id: "topDamage", name: "Chibrax au max", rule: "Le plus de dégâts sur les boss tués en raid VXV sur la saison." },
  {
    id: "topHealing",
    name: "Remboursé par la Sécu",
    rule: "Le plus de soins sur les boss tués en raid VXV sur la saison.",
  },
  {
    id: "mostRaised",
    name: "Lève toi copaing",
    rule: "Le plus de résurrections acceptées pendant les raids VXV sur la saison.",
  },
  { id: "sugarDaddy", name: "Sugar Daddy", rule: "Le plus gros donateur à la caisse de la guilde sur la saison." },
  { id: "cheater", name: "Il cheat c'est sûr", rule: "Plus gros gain net au deathroll sur la saison." },
  { id: "loser", name: "Loser", rule: "Plus grosse perte nette au deathroll sur la saison." },
] as const;

export type TitleId = (typeof TITLES)[number]["id"];

/** A member's score on a title's rule, and when they reached it. */
export interface TitleScore {
  memberId: string;
  score: number;
  reachedAt: Date;
}

/** Amounts of the members, each at its instant. */
export type Tally = readonly { memberId: string; amount: number; at: Date }[];

/** What the titles are computed from, over the season. */
export interface TitleFacts {
  /** The members' stakes on the bets ended in the season, refunds aside. */
  bets: readonly { memberId: string; amount: number; gain: number; endedAt: Date }[];
  /** The winner of the last mission validated, whenever it was. */
  lastMissionWinner: { memberId: string; at: Date } | undefined;
  /** The items received in raid during the season, by the member of the character who received them. */
  loots: readonly { memberId: string; at: Date }[];
  /** The deaths in VXV raids during the season, by member and raid. */
  deaths: Tally;
  /** The game's damage meter over the bosses killed in VXV raids during the season, by member and raid. */
  damage: Tally;
  healing: Tally;
  /** The resurrections accepted in VXV raids during the season, by member and raid. */
  raised: Tally;
  /** The donations to the guild's cash during the season. */
  donations: Tally;
  /** The deathrolls ended during the season, by the members who won and lost them. */
  deathrolls: readonly { winnerId: string; loserId: string; stake: number; endedAt: Date }[];
}

/** Each member's total of the amounts, reached at their latest one. */
function totals(entries: Tally): TitleScore[] {
  const byMember = new Map<string, TitleScore>();
  for (const entry of entries) {
    const known = byMember.get(entry.memberId);
    byMember.set(entry.memberId, {
      memberId: entry.memberId,
      score: (known?.score ?? 0) + entry.amount,
      reachedAt: known === undefined || entry.at > known.reachedAt ? entry.at : known.reachedAt,
    });
  }
  return [...byMember.values()];
}

/** The member ahead: the best positive score, the first to reach it in a tie; undefined when nobody scored. */
export function ahead(scores: readonly TitleScore[]): TitleScore | undefined {
  return scores
    .filter((score) => score.score > 0)
    .sort((left, right) => right.score - left.score || left.reachedAt.getTime() - right.reachedAt.getTime())[0];
}

/** The scores of each title's rule. */
function scoresByTitle(facts: TitleFacts): Record<TitleId, TitleScore[]> {
  const nets = totals(
    facts.bets.map((bet) => ({ memberId: bet.memberId, amount: bet.gain - bet.amount, at: bet.endedAt })),
  );
  const deathrolls = totals(
    facts.deathrolls.flatMap((game) => [
      { memberId: game.winnerId, amount: game.stake, at: game.endedAt },
      { memberId: game.loserId, amount: -game.stake, at: game.endedAt },
    ]),
  );
  return {
    gamblingKing: nets,
    debtKing: nets.map((net) => ({ ...net, score: -net.score })),
    numberOne:
      facts.lastMissionWinner === undefined
        ? []
        : [{ memberId: facts.lastMissionWinner.memberId, score: 1, reachedAt: facts.lastMissionWinner.at }],
    wellFed: totals(facts.loots.map((loot) => ({ ...loot, amount: 1 }))),
    floorTaster: totals(facts.deaths),
    topDamage: totals(facts.damage),
    topHealing: totals(facts.healing),
    mostRaised: totals(facts.raised),
    sugarDaddy: totals(facts.donations),
    cheater: deathrolls,
    loser: deathrolls.map((net) => ({ ...net, score: -net.score })),
  };
}

export interface TitleAward {
  titleId: TitleId;
  memberId: string;
  score: number;
}

/** This week's holder of each title; a title nobody scored on goes to nobody. */
export function awardTitles(facts: TitleFacts): TitleAward[] {
  const scores = scoresByTitle(facts);
  return TITLES.flatMap((title) => {
    const holder = ahead(scores[title.id]);
    return holder === undefined ? [] : [{ titleId: title.id, memberId: holder.memberId, score: holder.score }];
  });
}

/** The title of an id, or undefined for a title this version does not know. */
export function titleOf(titleId: string) {
  return TITLES.find((title) => title.id === titleId);
}

const WEDNESDAY = 3;
const DAYS_PER_WEEK = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The week the instant belongs to, as the date of its Wednesday (UTC): titles change each Wednesday at reset. */
export function titleWeek(instant: Date): string {
  const day = instant.getUTCDay();
  const sinceWednesday = (day - WEDNESDAY + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return new Date(instant.getTime() - sinceWednesday * DAY_MS).toISOString().slice(0, "YYYY-MM-DD".length);
}
