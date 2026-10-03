import { GUILD_TIME_ZONE } from "./dateTime";

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: GUILD_TIME_ZONE,
});
const EVENT_DATE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: GUILD_TIME_ZONE,
});

/** Short date and time, for lists: "10/12/2026 21:00". */
export function formatDateTime(date: Date): string {
  return DATE_TIME.format(date);
}

/** Full date and time of a raid night: "jeudi 10 décembre 2026 à 21:00". */
export function formatEventDate(date: Date): string {
  return EVENT_DATE.format(date);
}

/** "1 personnage", "3 personnages". */
export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Acronyms are invariable in French: "1 SR", "2 SR". */
export function softReserveCount(value: number): string {
  return count(value, "SR", "SR");
}

/** Raids of an evening joined in one title: "Onyxia + Mont Hyjal". */
export function raidTitle(raidNames: readonly string[]): string {
  return raidNames.join(" + ");
}
