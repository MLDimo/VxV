/** Letters that Unicode decomposition does not reduce to a plain Latin letter. */
const SPECIAL_LETTERS: Record<string, string> = { ð: "d", đ: "d", ø: "o", æ: "ae", œ: "oe", ß: "ss", þ: "th", ł: "l" };

/** Lower case, without accents or special letters: "Ðéjà" becomes "deja". */
export function normalizeForSearch(text: string): string {
  return [
    ...text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, ""),
  ]
    .map((letter) => SPECIAL_LETTERS[letter] ?? letter)
    .join("");
}

export interface SearchableCharacter {
  id: string;
  name: string;
  characterClass: string;
}

/** Characters whose name contains the query, names starting with it first. */
export function searchCharacters<Item extends SearchableCharacter>(
  characters: readonly Item[],
  query: string,
  limit: number,
): Item[] {
  const needle = normalizeForSearch(query.trim());
  if (needle.length === 0) {
    return [];
  }
  const matches = characters
    .map((character) => ({ character, name: normalizeForSearch(character.name) }))
    .filter(({ name }) => name.includes(needle));
  const startsFirst = (name: string) => (name.startsWith(needle) ? 0 : 1);
  return matches
    .sort((left, right) => startsFirst(left.name) - startsFirst(right.name))
    .slice(0, limit)
    .map(({ character }) => character);
}
