/** The texts the addon writes for the website (VXV-ROSTER, VXV-LOG, VXV-METIERS…): one record per line. */

const MS_PER_SECOND = 1000;
const FIELD_SEPARATOR = ";";

/** A text pasted from the addon that cannot be read: every problem found, with its line number. */
export class TextFormatError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(problems.join("\n"));
    this.name = new.target.name;
  }
}

/** A line of the text that is not blank: its number in the text (from 1) and its fields, trimmed. */
export interface TextLine {
  number: number;
  fields: string[];
}

/** The lines of the text that are not blank, fields separated by ";". */
export function textLines(text: string): TextLine[] {
  return text
    .split(/\r?\n/)
    .map((content, index) => ({ number: index + 1, content: content.trim() }))
    .filter((line) => line.content !== "")
    .map((line) => ({ number: line.number, fields: line.content.split(FIELD_SEPARATOR).map((field) => field.trim()) }));
}

/** A whole number of at least 0 written in a field, or undefined. */
export function wholeNumber(value: string | undefined): number | undefined {
  const number = Number(value);
  return value !== undefined && value !== "" && Number.isInteger(number) && number >= 0 ? number : undefined;
}

/** An instant written as Unix seconds (0 or empty: none), or undefined. */
export function instant(value: string | undefined): Date | undefined {
  const seconds = wholeNumber(value);
  return seconds === undefined || seconds === 0 ? undefined : new Date(seconds * MS_PER_SECOND);
}

/** Reads a line's fields after its kind; false when a value is wrong. */
export type RecordReader = (fields: string[]) => boolean;

/**
 * Reads a text of records under its header, line by line: the reader of each line's kind (its first field) takes
 * its other fields; lines of an unknown kind are skipped (a newer addon may add some). Throws a TextFormatError with
 * every unreadable line, or why the text is not of the format (another header).
 */
export function readRecords(
  text: string,
  format: {
    /** The headers read, the current version's last. */
    headers: readonly string[];
    wrongHeader: string;
    readers: Readonly<Record<string, RecordReader>>;
    /** What to do with an unreadable line ("recopiez le journal depuis l'addon"). */
    advice?: string;
  },
): void {
  const [header, ...rows] = textLines(text);
  if (header?.fields.length !== 1 || !format.headers.includes(header.fields[0] ?? "")) {
    throw new TextFormatError([format.wrongHeader]);
  }
  const advice = format.advice === undefined ? "" : ` : ${format.advice}`;
  const problems = rows
    .filter(({ fields: [kind = "", ...fields] }) => {
      const read = format.readers[kind];
      return read !== undefined && !read(fields);
    })
    .map((row) => `Ligne ${String(row.number)} illisible${advice}.`);
  if (problems.length > 0) {
    throw new TextFormatError(problems);
  }
}

/** Throws a TextFormatError when the text did not hold its main line ("ligne R manquante"). */
export function requireRecord<T>(value: T | undefined, problem: string): T {
  if (value === undefined) {
    throw new TextFormatError([problem]);
  }
  return value;
}
