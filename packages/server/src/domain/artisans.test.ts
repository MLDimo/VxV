import { describe, expect, it } from "vitest";
import { foldText, matchesSearch, parseProfessions, PROFESSIONS_HEADER } from "./artisans.ts";
import { TextFormatError } from "./textFormat.ts";

const TEXT = [
  PROFESSIONS_HEADER,
  "C;Ðéjà Vu",
  "P;129;Secourisme;22;75;1796904000;1796904060",
  "R;129;3275;Bandage en lin",
  "R;129;1244431;Potion de soins mineure",
  "P;182;Herboristerie;95;150;1796904000;0",
].join("\n");

describe("a character's professions from the addon", () => {
  it("reads the levels, and the recipes of the professions whose window was opened", () => {
    expect(parseProfessions(TEXT)).toEqual({
      character: "Ðéjà Vu",
      professions: [
        {
          professionId: 129,
          name: "Secourisme",
          level: 22,
          maxLevel: 75,
          readAt: new Date("2026-12-10T12:00:00Z"),
          recipes: {
            readAt: new Date("2026-12-10T12:01:00Z"),
            list: [
              { id: 3275, name: "Bandage en lin" },
              { id: 1244431, name: "Potion de soins mineure" },
            ],
          },
        },
        {
          professionId: 182,
          name: "Herboristerie",
          level: 95,
          maxLevel: 150,
          readAt: new Date("2026-12-10T12:00:00Z"),
          recipes: undefined,
        },
      ],
    });
  });

  it("lists every problem with its line, and refuses another format", () => {
    const broken = [PROFESSIONS_HEADER, "C;Ðéjà Vu", "P;129;Secourisme;x;75;1;0", "R;182;3275;Bandage en lin"];
    expect(() => parseProfessions(broken.join("\n"))).toThrow(TextFormatError);
    try {
      parseProfessions(broken.join("\n"));
    } catch (error) {
      expect((error as TextFormatError).problems).toEqual(["Ligne 3 illisible.", "Ligne 4 illisible."]);
    }
    expect(() => parseProfessions("VXV-LOG-2")).toThrow(/VXV-METIERS-1/);
    expect(() => parseProfessions(PROFESSIONS_HEADER)).toThrow(/ligne C manquante/);
  });
});

describe("searching a recipe", () => {
  it("finds a name holding every word, accents, case and ligatures aside", () => {
    expect(foldText("  Œufs  aux HERBES ")).toBe("oeufs aux herbes");
    expect(matchesSearch("potion soins", "Potion de soins mineure")).toBe(true);
    expect(matchesSearch("élixir", "Elixir de défense")).toBe(true);
    expect(matchesSearch("oeufs", "Œufs aux herbes")).toBe(true);
    expect(matchesSearch("potion mana", "Potion de soins mineure")).toBe(false);
    expect(matchesSearch("  ", "Bandage en lin")).toBe(false);
  });
});
