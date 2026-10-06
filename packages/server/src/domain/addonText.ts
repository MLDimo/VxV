/** The line format of the data the website hands to the addon (VXV-RAID, VXV-PARIS): fields separated by ";". */

const MS_PER_SECOND = 1000;

/** An instant as Unix seconds, as the game's clock reads it. */
export function seconds(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_SECOND);
}

/** Free text in one field: the separators of the format become commas. */
export function text(value: string): string {
  return value
    .split(/[;\r\n]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ");
}

export function line(...fields: readonly (string | number)[]): string {
  return fields.join(";");
}

export function flag(value: boolean): number {
  return value ? 1 : 0;
}
