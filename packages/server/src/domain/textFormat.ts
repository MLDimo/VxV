/** A text pasted from the addon that cannot be read: every problem found, with its line number. */
export class TextFormatError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(problems.join("\n"));
    this.name = new.target.name;
  }
}
