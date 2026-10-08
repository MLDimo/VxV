const MS_PER_SECOND = 1000;

/** A date Discord shows in each reader's time zone: F full, D date, R relative, t time. */
export function timestamp(date: Date, style: "F" | "D" | "R" | "t"): string {
  return `<t:${String(Math.floor(date.getTime() / MS_PER_SECOND))}:${style}>`;
}

/** U+1F130, the squared capital A: a title's letters each in its box, as Raid-Helper's. */
const SQUARED_A = 0x1f130;
const CODE_A = 65;

/** A title in squared capitals ("🄾🄽🅈🅇🄸🄰"): accents dropped, other characters kept. */
export function squared(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(SQUARED_A + letter.charCodeAt(0) - CODE_A));
}
