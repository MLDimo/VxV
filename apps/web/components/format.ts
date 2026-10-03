import { GUILD_TIME_ZONE } from "@vxv/server/domain/dateTime";

export { count, raidTitle, softReserveCount } from "@vxv/server/domain/labels";

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
