/** Times are entered and shown in the guild's time zone, and stored as instants (UTC). */
export const GUILD_TIME_ZONE = "Europe/Paris";

const MS_PER_SECOND = 1000;
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** How far the zone's wall clock is ahead of UTC at this instant, in milliseconds. */
function zoneOffset(instant: Date, timeZone: string): number {
  const wholeSeconds = Math.floor(instant.getTime() / MS_PER_SECOND) * MS_PER_SECOND;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(wholeSeconds));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  const wallClock = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wallClock - wholeSeconds;
}

/**
 * Instant of a "YYYY-MM-DDTHH:mm" wall-clock time (as entered in a datetime-local field) in the time zone.
 * Invalid input gives an invalid date, which the server refuses.
 */
export function wallClockToInstant(wallClock: string, timeZone = GUILD_TIME_ZONE): Date {
  const match = WALL_CLOCK.exec(wallClock);
  if (match === null) {
    return new Date(Number.NaN);
  }
  const [, year, month, day, hour, minute] = match.map(Number) as [number, number, number, number, number, number];
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Second pass: the offset may differ on either side of a daylight saving change.
  const firstGuess = asIfUtc - zoneOffset(new Date(asIfUtc), timeZone);
  return new Date(asIfUtc - zoneOffset(new Date(firstGuess), timeZone));
}

/** The first instant of the instant's month, in the time zone: the start of "this month". */
export function startOfMonth(instant: Date, timeZone = GUILD_TIME_ZONE): Date {
  const yearMonth = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).format(instant);
  return wallClockToInstant(`${yearMonth}-01T00:00`, timeZone);
}
