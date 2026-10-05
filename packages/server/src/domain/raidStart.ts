import { wallClockToInstant } from "./dateTime.ts";

const DATE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
const TIME = /^(\d{1,2})(?:[:h](\d{2})?)?$/i;
const MAX_HOUR = 23;
const MAX_MINUTE = 59;

const pad = (value: number) => String(value).padStart(2, "0");

/** True for a day of the calendar: no 31/02. */
function isRealDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Instant of a date and time typed by an officer in the guild's time zone: "12/12/2026", or "12/12" for the
 * next such day, and "21:00", "21h30" or "21h". Undefined when the input is not a real date and time.
 */
export function parseRaidStart(date: string, time: string, now: Date): Date | undefined {
  const dateMatch = DATE.exec(date.trim());
  const timeMatch = TIME.exec(time.trim());
  if (dateMatch === null || timeMatch === null) {
    return undefined;
  }
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? 0);
  if (hour > MAX_HOUR || minute > MAX_MINUTE) {
    return undefined;
  }
  const startIn = (year: number) =>
    isRealDay(year, month, day)
      ? wallClockToInstant(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`)
      : undefined;
  if (dateMatch[3] !== undefined) {
    return startIn(Number(dateMatch[3]));
  }
  const thisYear = now.getUTCFullYear();
  return [thisYear, thisYear + 1].map(startIn).find((start) => start !== undefined && start > now);
}
