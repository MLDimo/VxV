const MS_PER_SECOND = 1000;

/** A date Discord shows in each reader's time zone: F full, D date, R relative, t time. */
export function timestamp(date: Date, style: "F" | "D" | "R" | "t"): string {
  return `<t:${String(Math.floor(date.getTime() / MS_PER_SECOND))}:${style}>`;
}
