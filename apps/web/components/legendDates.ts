const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** The day of an exploit, « 3 sept. 2026 », from « 2026-09-03 ». */
export function legendDay(occurredOn: string): string {
  return DAY.format(new Date(`${occurredOn}T00:00:00Z`));
}

/** The hour of an exploit, « 23h38 », from « 23:38 ». */
export function legendHour(occurredTime: string): string {
  return occurredTime.replace(":", "h");
}
