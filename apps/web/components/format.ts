const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Dates are always shown in the guild's time zone. */
export function formatDateTime(date: Date): string {
  return DATE_TIME.format(date);
}

/** "1 personnage", "3 personnages". */
export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}
