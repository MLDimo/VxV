import { describe, expect, it } from "vitest";
import { normalizeForSearch, searchCharacters } from "./characterSearch";

describe("normalizeForSearch", () => {
  it.each([
    ["Ðéjà Vu", "deja vu"],
    ["Søren Æther", "soren aether"],
    ["CŒUR", "coeur"],
    ["Ugly Hole", "ugly hole"],
  ])("%s becomes %s", (text, expected) => {
    expect(normalizeForSearch(text)).toBe(expected);
  });
});

describe("searchCharacters", () => {
  const characters = [
    { id: "1", name: "Eole Hermes", characterClass: "WARRIOR" },
    { id: "2", name: "Ðéjà Vu", characterClass: "ROGUE" },
    { id: "3", name: "Vu Deja", characterClass: "MAGE" },
  ];

  it("finds names regardless of accents and case, starting matches first", () => {
    expect(searchCharacters(characters, "deja", 10).map((character) => character.id)).toEqual(["2", "3"]);
  });

  it("matches the last name too", () => {
    expect(searchCharacters(characters, "HERM", 10).map((character) => character.id)).toEqual(["1"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchCharacters(characters, "  ", 10)).toEqual([]);
    expect(searchCharacters(characters, "u", 2)).toHaveLength(2);
  });
});
