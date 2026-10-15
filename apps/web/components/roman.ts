const NUMERALS: readonly (readonly [number, string])[] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** A chapter's number as a door of the Hall of Fame writes it: I, II, III, IV… */
export function roman(value: number): string {
  let rest = value;
  let text = "";
  for (const [amount, numeral] of NUMERALS) {
    while (rest >= amount) {
      text += numeral;
      rest -= amount;
    }
  }
  return text;
}
