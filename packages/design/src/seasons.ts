/**
 * The WoW holidays the tavern dresses up for (owner's choice of 9 October: the game's calendar, by date). Each holiday
 * has its picture of the tavern, the places where they always are; outside a holiday, the tavern of every day. The
 * days are the website's and the addon's own (Europe/Paris), not the game servers'.
 */

/** A day of the year: month (1 to 12) and day. */
type MonthDay = readonly [month: number, day: number];

export interface Season {
  /** The picture's name: apps/web/public/images/tavernes/<id>.jpg, addon/VXV_Core/Media/Tavernes/<id>.png. */
  id: "voile-d-hiver" | "amour" | "jardin-des-nobles" | "solstice" | "brasseurs" | "sanssaint";
  name: string;
  /** The holiday's first and last days in that year ("YYYY-MM-DD"); one astride two years ends in the next. */
  days: (year: number) => readonly [first: string, last: string];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY_LENGTH = "YYYY-MM-DD".length;

const isoDay = (date: Date) => date.toISOString().slice(0, ISO_DAY_LENGTH);
const dayOf = (year: number, [month, day]: MonthDay) => new Date(Date.UTC(year, month - 1, day));

/** The same days each year, the last in the next year when it comes before the first in the calendar. */
function fixed(first: MonthDay, last: MonthDay): Season["days"] {
  const astride = last[0] < first[0];
  return (year) => [isoDay(dayOf(year, first)), isoDay(dayOf(astride ? year + 1 : year, last))];
}

/** Easter Sunday in the Gregorian calendar (Meeus, Jones and Butcher's algorithm). */
export function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayOf(year, [month, day]);
}

/** The week from Easter Sunday. */
const easterWeek: Season["days"] = (year) => {
  const sunday = easter(year);
  return [isoDay(sunday), isoDay(new Date(sunday.getTime() + 6 * DAY_MS))];
};

export const SEASONS: readonly Season[] = [
  { id: "voile-d-hiver", name: "Voile d'hiver", days: fixed([12, 15], [1, 2]) },
  { id: "amour", name: "De l'amour dans l'air", days: fixed([2, 7], [2, 20]) },
  { id: "jardin-des-nobles", name: "Jardin des nobles", days: easterWeek },
  { id: "solstice", name: "Fête du Feu du solstice d'été", days: fixed([6, 21], [7, 5]) },
  { id: "brasseurs", name: "Fête des Brasseurs", days: fixed([9, 20], [10, 6]) },
  { id: "sanssaint", name: "Sanssaint", days: fixed([10, 18], [11, 1]) },
];

/** The day of an instant in France ("YYYY-MM-DD"), where the guild plays. */
export function parisDay(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(instant);
}

/** The holiday of that day ("YYYY-MM-DD"), or undefined on any other day. */
export function seasonOn(day: string): Season | undefined {
  const year = Number(day.slice(0, "YYYY".length));
  return SEASONS.find((season) =>
    [year - 1, year].some((start) => {
      const [first, last] = season.days(start);
      return first <= day && day <= last;
    }),
  );
}

/** The years the addon knows the holidays of (Tokens.lua): it shows the tavern of every day after them. */
export const ADDON_SEASON_YEARS = { first: 2026, last: 2045 } as const;
